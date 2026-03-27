import { prisma } from '@rolodex/db';
import type { MessageDirection, Prisma } from '@rolodex/db';
import type {
  CreateUserDeviceTokenRequest,
  CreateUserDeviceTokenResponse,
  IMessageSyncStatus,
  SyncContactPayload,
  SyncMessagePayload,
  UserDeviceToken,
} from '@rolodex/types';
import { dedupeNormalizedValues, normalizeEmail, normalizePhoneNumber } from '@rolodex/types';
import { createDeviceToken, hashDeviceToken } from '../../utils/auth';
import { createAppError } from '../../utils/errors';

const CONTACTS_SOURCE = 'imessage_contacts';
const MESSAGES_SOURCE = 'imessage_messages';
const MAX_CONTACT_BATCH = 500;
const MAX_MESSAGE_BATCH = 500;
const CONTACT_TRANSACTION_CHUNK_SIZE = 100;
const MESSAGE_TRANSACTION_CHUNK_SIZE = 25;

const logSync = (message: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();

  if (details) {
    console.log(`[iMessage sync][${timestamp}] ${message}`, details);
    return;
  }

  console.log(`[iMessage sync][${timestamp}] ${message}`);
};

const sanitizeDeviceToken = (token: {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}): UserDeviceToken => ({
  id: token.id,
  name: token.name,
  createdAt: token.createdAt.toISOString(),
  lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
  revokedAt: token.revokedAt?.toISOString() ?? null,
});

const normalizeContact = (contact: SyncContactPayload) => ({
  firstName: contact.firstName?.trim() || null,
  lastName: contact.lastName?.trim() || null,
  phoneNumbers: dedupeNormalizedValues(contact.phoneNumbers ?? [], normalizePhoneNumber),
  emails: dedupeNormalizedValues(contact.emails ?? [], normalizeEmail),
  modifiedAt: contact.modifiedAt?.trim() || null,
});

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const findPersonByIdentifiers = async (
  tx: Prisma.TransactionClient,
  userId: string,
  phoneNumbers: string[],
  emails: string[]
) => {
  if (!phoneNumbers.length && !emails.length) {
    return null;
  }

  return tx.person.findFirst({
    where: {
      userId,
      deletedAt: null,
      OR: [
        ...(phoneNumbers.length
          ? [
              {
                phones: {
                  some: {
                    phoneNumber: { in: phoneNumbers },
                  },
                },
              },
            ]
          : []),
        ...(emails.length
          ? [
              {
                emails: {
                  some: {
                    email: { in: emails },
                  },
                },
              },
            ]
          : []),
      ],
    },
    include: {
      phones: true,
      emails: true,
      messageEvent: true,
    },
  });
};

const upsertCursor = async (
  tx: Prisma.TransactionClient,
  userId: string,
  source: string,
  cursor: string | null
) => {
  await tx.userSyncCursor.upsert({
    where: {
      userId_source: {
        userId,
        source,
      },
    },
    update: {
      cursor,
      lastSuccessAt: new Date(),
    },
    create: {
      userId,
      source,
      cursor,
      lastSuccessAt: new Date(),
    },
  });
};

export const createUserDeviceToken = async (
  userId: string,
  input: CreateUserDeviceTokenRequest
): Promise<CreateUserDeviceTokenResponse> => {
  const name = input.name.trim();
  if (!name) {
    throw createAppError('Token name is required.', 400);
  }

  const plainToken = createDeviceToken();
  const tokenHash = hashDeviceToken(plainToken);
  const deviceToken = await prisma.userDeviceToken.create({
    data: {
      userId,
      name,
      tokenHash,
    },
  });

  return {
    token: plainToken,
    deviceToken: sanitizeDeviceToken(deviceToken),
  };
};

export const listUserDeviceTokens = async (userId: string) => {
  const tokens = await prisma.userDeviceToken.findMany({
    where: { userId },
    orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
  });

  return tokens.map(sanitizeDeviceToken);
};

export const revokeUserDeviceToken = async (userId: string, id: string) => {
  const existing = await prisma.userDeviceToken.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw createAppError('Device token not found.', 404);
  }

  await prisma.userDeviceToken.update({
    where: { id },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const getIMessageSyncStatus = async (userId: string): Promise<IMessageSyncStatus> => {
  const cursors = await prisma.userSyncCursor.findMany({
    where: {
      userId,
      source: {
        in: [CONTACTS_SOURCE, MESSAGES_SOURCE],
      },
    },
  });

  const findCursor = (source: string) => cursors.find((cursor) => cursor.source === source);
  const mapCursor = (source: string) => {
    const cursor = findCursor(source);
    return cursor
      ? {
          source,
          cursor: cursor.cursor,
          lastSuccessAt: cursor.lastSuccessAt?.toISOString() ?? null,
        }
      : null;
  };

  return {
    contacts: mapCursor(CONTACTS_SOURCE),
    messages: mapCursor(MESSAGES_SOURCE),
  };
};

export const syncContacts = async (userId: string, contacts: SyncContactPayload[]) => {
  if (contacts.length > MAX_CONTACT_BATCH) {
    throw createAppError(`Contact batch exceeds ${MAX_CONTACT_BATCH} items.`, 400);
  }

  const normalizedContacts = contacts.map(normalizeContact);
  const contactChunks = chunk(normalizedContacts, CONTACT_TRANSACTION_CHUNK_SIZE);

  logSync('Starting contacts sync', {
    userId,
    contacts: normalizedContacts.length,
    chunks: contactChunks.length,
  });

  for (const [chunkIndex, contactChunk] of contactChunks.entries()) {
    const startedAt = Date.now();
    logSync('Processing contacts transaction chunk', {
      chunk: chunkIndex + 1,
      totalChunks: contactChunks.length,
      count: contactChunk.length,
    });

    await prisma.$transaction(
      async (tx) => {
        for (const contact of contactChunk) {
          if (!contact.phoneNumbers.length && !contact.emails.length) {
            continue;
          }

          const existing = await findPersonByIdentifiers(
            tx,
            userId,
            contact.phoneNumbers,
            contact.emails
          );

          if (!existing) {
            await tx.person.create({
              data: {
                userId,
                firstName: contact.firstName,
                lastName: contact.lastName,
                phones: contact.phoneNumbers.length
                  ? {
                      create: contact.phoneNumbers.map((phoneNumber, index) => ({
                        phoneNumber,
                        isPrimary: index === 0,
                      })),
                    }
                  : undefined,
                emails: contact.emails.length
                  ? {
                      create: contact.emails.map((email, index) => ({
                        email,
                        isPrimary: index === 0,
                      })),
                    }
                  : undefined,
              },
            });
            continue;
          }

          const existingPhones = new Set(existing.phones.map((phone) => phone.phoneNumber));
          const existingEmails = new Set(existing.emails.map((email) => email.email));
          const missingPhoneNumbers = contact.phoneNumbers.filter(
            (phoneNumber) => !existingPhones.has(phoneNumber)
          );
          const missingEmails = contact.emails.filter((email) => !existingEmails.has(email));

          await tx.person.update({
            where: { id: existing.id },
            data: {
              firstName: existing.firstName || contact.firstName || undefined,
              lastName: existing.lastName || contact.lastName || undefined,
              phones: {
                create: missingPhoneNumbers.map((phoneNumber, index) => ({
                  phoneNumber,
                  isPrimary: existing.phones.length === 0 && index === 0,
                })),
              },
              emails: {
                create: missingEmails.map((email, index) => ({
                  email,
                  isPrimary: existing.emails.length === 0 && index === 0,
                })),
              },
            },
          });
        }
      },
      {
        timeout: 30000,
      }
    );

    logSync('Completed contacts transaction chunk', {
      chunk: chunkIndex + 1,
      totalChunks: contactChunks.length,
      durationMs: Date.now() - startedAt,
    });
  }

  const cursor =
    normalizedContacts
      .map((contact) => contact.modifiedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? new Date().toISOString();

  await prisma.$transaction((tx) => upsertCursor(tx, userId, CONTACTS_SOURCE, cursor));

  logSync('Completed contacts sync', {
    userId,
    contacts: normalizedContacts.length,
    cursor,
  });
};

const resolveMessageHandle = (handle: string) => {
  const normalizedEmail = normalizeEmail(handle);
  if (normalizedEmail.includes('@')) {
    return {
      emails: [normalizedEmail],
      phoneNumbers: [] as string[],
    };
  }

  return {
    emails: [] as string[],
    phoneNumbers: [normalizePhoneNumber(handle)],
  };
};

export const syncMessages = async (userId: string, messages: SyncMessagePayload[]) => {
  if (messages.length > MAX_MESSAGE_BATCH) {
    throw createAppError(`Message batch exceeds ${MAX_MESSAGE_BATCH} items.`, 400);
  }

  const orderedMessages = [...messages].sort((left, right) => left.cursor - right.cursor);
  const messageChunks = chunk(orderedMessages, MESSAGE_TRANSACTION_CHUNK_SIZE);

  logSync('Starting message sync', {
    userId,
    messages: orderedMessages.length,
    chunks: messageChunks.length,
    firstCursor: orderedMessages[0]?.cursor ?? null,
    lastCursor: orderedMessages.at(-1)?.cursor ?? null,
  });

  for (const [chunkIndex, messageChunk] of messageChunks.entries()) {
    const startedAt = Date.now();
    logSync('Processing message transaction chunk', {
      chunk: chunkIndex + 1,
      totalChunks: messageChunks.length,
      count: messageChunk.length,
      firstCursor: messageChunk[0]?.cursor ?? null,
      lastCursor: messageChunk.at(-1)?.cursor ?? null,
    });

    await prisma.$transaction(
      async (tx) => {
        for (const message of messageChunk) {
          const identifiers = resolveMessageHandle(message.handle);
          const existing = await findPersonByIdentifiers(
            tx,
            userId,
            identifiers.phoneNumbers,
            identifiers.emails
          );

          const person =
            existing ??
            (await tx.person.create({
              data: {
                userId,
                firstName: null,
                lastName: null,
                phones: identifiers.phoneNumbers.length
                  ? {
                      create: identifiers.phoneNumbers.map((phoneNumber, index) => ({
                        phoneNumber,
                        isPrimary: index === 0,
                      })),
                    }
                  : undefined,
                emails: identifiers.emails.length
                  ? {
                      create: identifiers.emails.map((email, index) => ({
                        email,
                        isPrimary: index === 0,
                      })),
                    }
                  : undefined,
              },
              include: {
                messageEvent: true,
              },
            }));

          const sentAt = new Date(message.sentAt);
          const currentEvent = await tx.messageEvent.findUnique({
            where: { personId: person.id },
          });

          if (currentEvent && currentEvent.sentAt > sentAt) {
            continue;
          }

          await tx.messageEvent.upsert({
            where: { personId: person.id },
            update: {
              body: message.body ?? null,
              sentAt,
              direction: message.direction as MessageDirection,
            },
            create: {
              personId: person.id,
              body: message.body ?? null,
              sentAt,
              direction: message.direction as MessageDirection,
            },
          });
        }
      },
      {
        timeout: 30000,
      }
    );

    logSync('Completed message transaction chunk', {
      chunk: chunkIndex + 1,
      totalChunks: messageChunks.length,
      durationMs: Date.now() - startedAt,
      lastCursor: messageChunk.at(-1)?.cursor ?? null,
    });
  }

  const highestCursor = orderedMessages.at(-1)?.cursor;
  await prisma.$transaction((tx) =>
    upsertCursor(tx, userId, MESSAGES_SOURCE, highestCursor ? String(highestCursor) : null)
  );

  logSync('Completed message sync', {
    userId,
    messages: orderedMessages.length,
    cursor: highestCursor ?? null,
  });
};
