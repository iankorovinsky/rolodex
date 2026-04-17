import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import {
  normalizeEmail,
  normalizePhoneNumber,
  type IMessageSyncStatus,
  type MessageDirection,
  type SyncContactPayload,
  type SyncMessagePayload,
} from '@rolodex/types';

const execFileAsync = promisify(execFile);
const DEFAULT_CHAT_DB_PATH = `${homedir()}/Library/Messages/chat.db`;
const CHILD_PROCESS_MAX_BUFFER = 64 * 1024 * 1024;
const API_BATCH_SIZE = 250;

type CliOptions = {
  apiUrl: string;
  deviceToken: string;
  chatDbPath: string;
};

const log = (message: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  if (details) {
    console.log(`[${timestamp}] ${message}`, details);
    return;
  }

  console.log(`[${timestamp}] ${message}`);
};

const parseArgs = (): CliOptions => {
  const args = Bun.argv.slice(2);
  const readOption = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };

  const apiUrl = readOption('--api-url') || process.env.API_URL;
  const deviceToken = readOption('--device-token');
  const chatDbPath = readOption('--chat-db-path') || DEFAULT_CHAT_DB_PATH;

  if (!apiUrl || !deviceToken) {
    throw new Error('Usage: bun run src/index.ts --api-url <url> --device-token <token>');
  }

  return {
    apiUrl: apiUrl.replace(/\/$/, ''),
    deviceToken,
    chatDbPath,
  };
};

const fetchJson = async <T>(url: string, deviceToken: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deviceToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || `Request failed: ${response.status}`);
  }

  return payload.data as T;
};

const loadContacts = async (): Promise<SyncContactPayload[]> => {
  try {
    log('Loading contacts from macOS Contacts');
    const { stdout } = await execFileAsync(
      'osascript',
      ['-l', 'JavaScript', new URL('./contacts.jxa', import.meta.url).pathname],
      {
        maxBuffer: CHILD_PROCESS_MAX_BUFFER,
      }
    );
    const parsed = JSON.parse(stdout.trim());
    if (parsed.error) {
      throw new Error(parsed.error);
    }

    const contacts = (parsed as SyncContactPayload[]).map((contact) => ({
      firstName: contact.firstName?.trim() || null,
      lastName: contact.lastName?.trim() || null,
      phoneNumbers: (contact.phoneNumbers ?? []).map(normalizePhoneNumber).filter(Boolean),
      emails: (contact.emails ?? []).map(normalizeEmail).filter(Boolean),
      modifiedAt: contact.modifiedAt ?? null,
    }));

    log('Loaded contacts', { count: contacts.length });
    return contacts;
  } catch (error) {
    throw new Error(
      `Contacts access failed. Grant Contacts permission and retry. ${String(error)}`
    );
  }
};

const stageMessagesDatabase = async (chatDbPath: string) => {
  const tempDir = await mkdtemp(join(Bun.env.TMPDIR || '/tmp', 'rolodex-imessage-sync-'));
  const stagedDbPath = join(tempDir, basename(chatDbPath));
  const walPath = `${chatDbPath}-wal`;
  const shmPath = `${chatDbPath}-shm`;
  const stagedWalPath = `${stagedDbPath}-wal`;
  const stagedShmPath = `${stagedDbPath}-shm`;

  log('Staging Messages database copy', { source: chatDbPath, tempDir });
  await copyFile(chatDbPath, stagedDbPath);

  try {
    await copyFile(walPath, stagedWalPath);
  } catch {}

  try {
    await copyFile(shmPath, stagedShmPath);
  } catch {}

  return {
    stagedDbPath,
    cleanup: async () => {
      log('Cleaning up staged Messages database', { tempDir });
      await rm(tempDir, { recursive: true, force: true });
    },
  };
};

const loadMessages = async (chatDbPath: string, cursor: number): Promise<SyncMessagePayload[]> => {
  const sql = `
    SELECT
      message.ROWID,
      handle.id,
      message.text,
      message.date,
      message.is_from_me
    FROM message
    JOIN handle ON handle.ROWID = message.handle_id
    WHERE message.ROWID > ${cursor}
      AND handle.id IS NOT NULL
    ORDER BY message.ROWID ASC
  `;

  const { stagedDbPath, cleanup } = await stageMessagesDatabase(chatDbPath);

  try {
    log('Loading messages from staged database', { cursor, path: stagedDbPath });
    const { stdout } = await execFileAsync('sqlite3', ['-json', stagedDbPath, sql], {
      maxBuffer: CHILD_PROCESS_MAX_BUFFER,
    });
    const rows = JSON.parse(stdout || '[]') as Array<{
      ROWID: number;
      id: string;
      text: string | null;
      date: number;
      is_from_me: number;
    }>;

    const latestByHandle = new Map<string, SyncMessagePayload>();
    for (const row of rows) {
      const handle = row.id.includes('@') ? normalizeEmail(row.id) : normalizePhoneNumber(row.id);
      latestByHandle.set(handle, {
        handle,
        body: row.text,
        sentAt: appleTimestampToIso(row.date),
        direction: row.is_from_me ? 'OUTBOUND' : 'INBOUND',
        cursor: row.ROWID,
      });
    }

    const messages = Array.from(latestByHandle.values()).sort(
      (left, right) => left.cursor - right.cursor
    );
    log('Loaded message summaries', { rawRows: rows.length, uniqueHandles: messages.length });
    return messages;
  } catch (error) {
    throw new Error(
      `Messages database access failed. Grant Full Disk Access and ensure ${chatDbPath} is readable. ${String(error)}`
    );
  } finally {
    await cleanup();
  }
};

const chunkItems = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const uploadInChunks = async <T>({
  items,
  endpoint,
  payloadKey,
  deviceToken,
  label,
}: {
  items: T[];
  endpoint: string;
  payloadKey: string;
  deviceToken: string;
  label: string;
}) => {
  const chunks = chunkItems(items, API_BATCH_SIZE);

  for (const [index, chunk] of chunks.entries()) {
    log(`Uploading ${label} chunk`, {
      chunk: index + 1,
      totalChunks: chunks.length,
      count: chunk.length,
    });
    await fetchJson(endpoint, deviceToken, {
      method: 'POST',
      body: JSON.stringify({ [payloadKey]: chunk }),
    });
  }
};

const appleTimestampToIso = (value: number) => {
  const secondsSinceAppleEpoch = value > 1_000_000_000_000 ? value / 1_000_000_000 : value;
  const unixSeconds = secondsSinceAppleEpoch + 978307200;
  return new Date(unixSeconds * 1000).toISOString();
};

const run = async () => {
  if (process.platform !== 'darwin') {
    throw new Error('The iMessage sync runner is macOS-only.');
  }

  const options = parseArgs();
  log('Starting iMessage sync', {
    apiUrl: options.apiUrl,
    chatDbPath: options.chatDbPath,
  });
  const status = await fetchJson<IMessageSyncStatus>(
    `${options.apiUrl}/api/integrations/imessage/status`,
    options.deviceToken
  );
  log('Fetched sync status', {
    contactsCursor: status.contacts?.cursor ?? null,
    messagesCursor: status.messages?.cursor ?? null,
  });

  const contacts = await loadContacts();
  log('Preparing contacts upload', { count: contacts.length });
  await uploadInChunks({
    items: contacts,
    endpoint: `${options.apiUrl}/api/integrations/imessage/sync/contacts`,
    payloadKey: 'contacts',
    deviceToken: options.deviceToken,
    label: 'contacts',
  });

  const currentCursor = Number(status.messages?.cursor || 0);
  const messages = await loadMessages(options.chatDbPath, currentCursor);
  if (messages.length > 0) {
    log('Preparing message summaries upload', {
      count: messages.length,
      cursorStart: currentCursor,
    });
    await uploadInChunks({
      items: messages,
      endpoint: `${options.apiUrl}/api/integrations/imessage/sync/messages`,
      payloadKey: 'messages',
      deviceToken: options.deviceToken,
      label: 'message summaries',
    });
  }

  log('Finished iMessage sync', {
    contactsSynced: contacts.length,
    messagesSynced: messages.length,
    messageCursorStart: currentCursor,
    messageCursorEnd: messages.at(-1)?.cursor ?? currentCursor,
  });
  console.log(
    JSON.stringify({
      contactsSynced: contacts.length,
      messagesSynced: messages.length,
      messageCursorStart: currentCursor,
      messageCursorEnd: messages.at(-1)?.cursor ?? currentCursor,
    })
  );
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
