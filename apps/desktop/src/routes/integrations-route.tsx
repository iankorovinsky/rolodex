import { useEffect, useEffectEvent, useState } from 'react';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { IntegrationCard } from '@/components/integrations/integration-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  connectGranolaIntegration,
  connectOAuthIntegration,
  createDeviceToken,
  disconnectIntegration,
  getDeviceTokens,
  getIMessageSyncStatus,
  getIntegrations,
  revokeDeviceToken,
} from '@/lib/rolodex/api';
import {
  INTEGRATION_CONFIGS,
  type IMessageSyncStatus,
  type IntegrationConnection,
  type IntegrationType,
  type OAuthIntegrationType,
  type UserDeviceToken,
} from '@rolodex/types';

const formatTimestamp = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : 'Never';

const apiUrl = import.meta.env.API_URL || '';

const integrationOrder: IntegrationType[] = ['granola', 'google', 'outlook', 'imessage'];

export function IntegrationsRoute() {
  const runnerSupported = window.rolodexDesktop?.runnerSupported ?? false;
  const desktopPlatform = window.rolodexDesktop?.platform ?? 'unknown';
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [deviceTokens, setDeviceTokens] = useState<UserDeviceToken[]>([]);
  const [status, setStatus] = useState<IMessageSyncStatus | null>(null);
  const [tokenName, setTokenName] = useState('My MacBook');
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isGranolaConnecting, setIsGranolaConnecting] = useState(false);
  const [connectingType, setConnectingType] = useState<OAuthIntegrationType | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const load = useEffectEvent(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [integrationData, tokens, syncStatus] = await Promise.all([
        getIntegrations(),
        runnerSupported ? getDeviceTokens() : Promise.resolve([]),
        runnerSupported ? getIMessageSyncStatus() : Promise.resolve(null),
      ]);

      setIntegrations(integrationData);
      setDeviceTokens(tokens);
      setStatus(syncStatus);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load integrations.');
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const result = await createDeviceToken({ name: tokenName.trim() });
      setRevealedToken(result.token);
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create a device token.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setErrorMessage(null);

    try {
      await revokeDeviceToken(id);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to revoke the device token.'
      );
    }
  };

  const handleGranolaConnect = async () => {
    if (!window.rolodexDesktop?.startGranolaOAuth) {
      setErrorMessage('Granola sign-in is only available from the desktop app.');
      return;
    }

    setIsGranolaConnecting(true);
    setErrorMessage(null);

    try {
      const oauthResult = await window.rolodexDesktop.startGranolaOAuth();
      await connectGranolaIntegration(oauthResult);
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect Granola.');
    } finally {
      setIsGranolaConnecting(false);
    }
  };

  const handleDisconnect = async (connection: IntegrationConnection) => {
    setDisconnectingId(connection.id);
    setErrorMessage(null);

    try {
      await disconnectIntegration(connection.id);
      await load();
    } catch (error) {
      await load().catch(() => undefined);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `Failed to disconnect ${INTEGRATION_CONFIGS[connection.type].label}.`
      );
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleOAuthConnect = async (type: OAuthIntegrationType) => {
    if (!window.rolodexDesktop?.startProviderOAuth) {
      setErrorMessage(
        `${INTEGRATION_CONFIGS[type].label} sign-in is only available from the desktop app.`
      );
      return;
    }

    setConnectingType(type);
    setErrorMessage(null);

    try {
      const oauthResult = await window.rolodexDesktop.startProviderOAuth(type);

      await connectOAuthIntegration(type, {
        accessToken: oauthResult.accessToken,
        refreshToken: oauthResult.refreshToken ?? null,
        tokenType: oauthResult.tokenType ?? null,
        scope: oauthResult.scope ?? null,
        expiresAt: oauthResult.expiresAt ?? null,
        externalAccountId: oauthResult.externalAccountId,
        accountEmail: oauthResult.accountEmail ?? null,
        accountLabel: oauthResult.accountLabel ?? null,
      });

      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `Failed to connect ${INTEGRATION_CONFIGS[type].label}.`
      );
    } finally {
      setConnectingType(null);
    }
  };

  const connectionByType = new Map<IntegrationType, IntegrationConnection[]>(
    integrationOrder.map((type) => [
      type,
      integrations.filter((integration) => integration.type === type),
    ])
  );
  const activeDeviceTokens = deviceTokens.filter((token) => !token.revokedAt);

  const iMessageHelperText = runnerSupported
    ? activeDeviceTokens.length > 0
      ? `${activeDeviceTokens.length} active runner token${activeDeviceTokens.length === 1 ? '' : 's'}. Last message sync: ${formatTimestamp(status?.messages?.lastSuccessAt)}`
      : 'Create a runner token below to sync Messages and Contacts from your Mac.'
    : `Runner setup is disabled on ${desktopPlatform}.`;

  const runnerCommand =
    revealedToken && apiUrl
      ? `bun run imessage-sync -- --api-url ${apiUrl} --device-token ${revealedToken}`
      : null;

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Connect external sources to Rolodex. Granola is live now; Google and Outlook are
              scaffolded next.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {errorMessage ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          {integrationOrder.map((type) => {
            const config = INTEGRATION_CONFIGS[type];
            const connections = connectionByType.get(type) ?? [];

            if (type === 'granola') {
              const latestConnection = connections[0];
              const helperText = latestConnection?.connected
                ? `${latestConnection.connectionStatus === 'reconnect_required' ? 'Reconnect required.' : latestConnection.connectionStatus === 'refresh_failed' ? 'Token refresh is failing; Rolodex will retry automatically.' : 'Healthy connection.'} Validated ${formatTimestamp(latestConnection.lastValidatedAt)}. Last refresh ${formatTimestamp(latestConnection.lastRefreshAt)}. ${latestConnection.toolCount ?? 0} MCP tool${latestConnection.toolCount === 1 ? '' : 's'} available.`
                : 'Uses Granola browser OAuth with the MCP Streamable HTTP endpoint.';

              return (
                <IntegrationCard
                  key={type}
                  config={config}
                  connections={connections}
                  connectLabel={connections.length > 0 ? 'Connect another' : 'Connect'}
                  helperText={helperText}
                  isBusy={
                    isGranolaConnecting || connections.some((item) => item.id === disconnectingId)
                  }
                  onConnect={() => void handleGranolaConnect()}
                  onDisconnect={(connectionId) => {
                    const connection = connections.find((item) => item.id === connectionId);
                    if (connection) {
                      void handleDisconnect(connection);
                    }
                  }}
                />
              );
            }

            if (type === 'imessage') {
              return (
                <IntegrationCard
                  key={type}
                  config={config}
                  connectLabel="Manage below"
                  disabled
                  helperText={iMessageHelperText}
                />
              );
            }

            const helperText =
              connections.length > 0
                ? `${connections.length} account${connections.length === 1 ? '' : 's'} connected.`
                : `Connect one or more ${config.label} accounts to Rolodex.`;

            return (
              <IntegrationCard
                key={type}
                config={config}
                connections={connections}
                connectLabel={connections.length > 0 ? 'Connect another' : 'Connect'}
                helperText={helperText}
                isBusy={
                  connectingType === type || connections.some((item) => item.id === disconnectingId)
                }
                onConnect={() => void handleOAuthConnect(type)}
                onDisconnect={(connectionId) => {
                  const connection = connections.find((item) => item.id === connectionId);
                  if (connection) {
                    void handleDisconnect(connection);
                  }
                }}
              />
            );
          })}
        </section>

        {!runnerSupported ? (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
            <h2 className="text-lg font-medium">Runner unavailable on this device</h2>
            <p className="mt-2 text-sm">
              The iMessage runner is only supported on macOS. This device reports `{desktopPlatform}
              `, so Rolodex will not let you create runner tokens or show runner setup actions here.
            </p>
          </section>
        ) : null}

        <section className="rounded-xl border p-6">
          <h2 className="text-lg font-medium">iMessage sync status</h2>
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
          <h2 className="text-lg font-medium">iMessage device tokens</h2>
          <div className="mt-4 flex gap-3">
            <Input value={tokenName} onChange={(event) => setTokenName(event.target.value)} />
            <Button
              onClick={() => void handleCreate()}
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
          <h2 className="text-lg font-medium">iMessage runner setup</h2>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            {runnerSupported ? (
              <>
                <p>1. Create a device token above.</p>
                <p>2. Copy the generated runner command and execute it on your Mac.</p>
                <p>3. Grant Contacts permission when macOS prompts.</p>
                <p>4. Grant Full Disk Access so the runner can read Messages `chat.db`.</p>
              </>
            ) : (
              <p>
                Runner setup is disabled on non-macOS devices because the sync runner only supports
                Messages and Contacts on macOS.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
