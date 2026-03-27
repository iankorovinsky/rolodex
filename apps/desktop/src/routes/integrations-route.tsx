import { useEffect, useState } from 'react';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createDeviceToken,
  getDeviceTokens,
  getIMessageSyncStatus,
  revokeDeviceToken,
} from '@/lib/rolodex/api';
import type { IMessageSyncStatus, UserDeviceToken } from '@rolodex/types';

const formatTimestamp = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : 'Never';

const apiUrl = import.meta.env.API_URL || '';

export function IntegrationsRoute() {
  const runnerSupported = window.rolodexDesktop?.runnerSupported ?? false;
  const desktopPlatform = window.rolodexDesktop?.platform ?? 'unknown';
  const [deviceTokens, setDeviceTokens] = useState<UserDeviceToken[]>([]);
  const [status, setStatus] = useState<IMessageSyncStatus | null>(null);
  const [tokenName, setTokenName] = useState('My MacBook');
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      if (!runnerSupported) {
        setDeviceTokens([]);
        setStatus(null);
        return;
      }

      const [tokens, syncStatus] = await Promise.all([getDeviceTokens(), getIMessageSyncStatus()]);
      setDeviceTokens(tokens);
      setStatus(syncStatus);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load().catch((error) => console.error('Failed to load integrations', error));
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const result = await createDeviceToken({ name: tokenName });
      setRevealedToken(result.token);
      await load();
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await revokeDeviceToken(id);
    await load();
  };

  const runnerCommand =
    revealedToken && apiUrl
      ? `bun run imessage-sync -- --api-url ${apiUrl} --device-token ${revealedToken}`
      : null;

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Manage device tokens and the macOS runner used to sync iMessage data.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={!runnerSupported}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {!runnerSupported ? (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
            <h2 className="text-lg font-medium">Runner unavailable on this device</h2>
            <p className="mt-2 text-sm">
              The iMessage runner is only supported on macOS. This device reports `{desktopPlatform}`,
              so Rolodex will not let you create runner tokens or show runner setup actions here.
            </p>
          </section>
        ) : null}

        <section className="rounded-xl border p-6">
          <h2 className="text-lg font-medium">Sync status</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 p-4">
              <div className="text-sm font-medium">Contacts</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Last success: {formatTimestamp(status?.contacts?.lastSuccessAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                Cursor: {status?.contacts?.cursor || 'Not set'}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <div className="text-sm font-medium">Messages</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Last success: {formatTimestamp(status?.messages?.lastSuccessAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                Cursor: {status?.messages?.cursor || 'Not set'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border p-6">
          <h2 className="text-lg font-medium">Device tokens</h2>
          <div className="mt-4 flex gap-3">
            <Input value={tokenName} onChange={(event) => setTokenName(event.target.value)} />
            <Button
              onClick={handleCreate}
              disabled={!runnerSupported || isCreating || !tokenName.trim()}
            >
              Create token
            </Button>
          </div>

          {revealedToken ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-medium">Copy this token now</div>
              <div className="mt-2 flex gap-2">
                <Input readOnly value={revealedToken} />
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(revealedToken)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {runnerCommand ? (
                <div className="mt-4">
                  <div className="text-sm font-medium">Runner command</div>
                  <div className="mt-2 flex gap-2">
                    <Input readOnly value={runnerCommand} />
                    <Button
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(runnerCommand)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {deviceTokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <div className="font-medium">{token.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Created {formatTimestamp(token.createdAt)}. Last used{' '}
                    {formatTimestamp(token.lastUsedAt)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleRevoke(token.id)}
                  disabled={!runnerSupported || Boolean(token.revokedAt)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!isLoading && deviceTokens.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runner tokens yet.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border p-6">
          <h2 className="text-lg font-medium">Runner setup</h2>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            {runnerSupported ? (
              <>
                <p>1. Create a device token above.</p>
                <p>2. Copy the generated runner command and execute it on your Mac.</p>
                <p>3. Grant Contacts permission when macOS prompts.</p>
                <p>4. Grant Full Disk Access so the runner can read Messages `chat.db`.</p>
              </>
            ) : (
              <p>Runner setup is disabled on non-macOS devices because the sync runner only supports Messages and Contacts on macOS.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
