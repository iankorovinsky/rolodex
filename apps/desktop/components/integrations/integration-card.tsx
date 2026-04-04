'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IntegrationConfig, IntegrationConnection, IntegrationType } from '@rolodex/types';

const integrationLogoPaths: Record<IntegrationType, string> = {
  imessage: '/integrations/imessage.svg',
  google: '/integrations/google.svg',
  outlook: '/integrations/outlook.svg',
  granola: '/integrations/granola.svg',
};

interface IntegrationCardProps {
  config: IntegrationConfig;
  connections?: IntegrationConnection[];
  connectLabel?: string;
  disabled?: boolean;
  helperText?: string;
  isBusy?: boolean;
  onConnect?: () => void;
  onDisconnect?: (connectionId: string) => void;
}

export function IntegrationCard({
  config,
  connections = [],
  connectLabel = 'Connect',
  disabled = false,
  helperText,
  isBusy = false,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const isConnected = connections.length > 0;
  const logoPath = integrationLogoPaths[config.type];
  const hasReconnectRequired = connections.some(
    (connection) => connection.connectionStatus === 'reconnect_required'
  );
  const hasRefreshFailure = connections.some(
    (connection) => connection.connectionStatus === 'refresh_failed'
  );

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-2xl border bg-white shadow-sm">
            <img src={logoPath} alt="" className="block size-full aspect-square object-cover" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{config.label}</h3>
              <Badge
                variant="outline"
                className={cn(
                  isConnected &&
                    !hasReconnectRequired &&
                    !hasRefreshFailure &&
                    'border-emerald-200 bg-emerald-50 text-emerald-700',
                  hasRefreshFailure && 'border-amber-200 bg-amber-50 text-amber-700',
                  hasReconnectRequired && 'border-red-200 bg-red-50 text-red-700',
                  !isConnected && config.comingSoon && 'border-slate-200 bg-slate-50 text-slate-600'
                )}
              >
                {hasReconnectRequired
                  ? 'Reconnect required'
                  : hasRefreshFailure
                    ? 'Attention needed'
                    : isConnected
                      ? 'Connected'
                      : config.comingSoon
                        ? 'Coming soon'
                        : 'Available'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
            {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
            {connections.length > 0 ? (
              <div className="space-y-2 pt-1">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-foreground">
                        {connection.accountLabel ||
                          connection.accountEmail ||
                          connection.externalAccountId ||
                          config.label}
                      </div>
                      {connection.accountEmail ? (
                        <div className="truncate text-xs text-muted-foreground">
                          {connection.accountEmail}
                        </div>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {connection.connectionStatus === 'active'
                            ? 'Healthy'
                            : connection.connectionStatus === 'refresh_failed'
                              ? 'Refresh failed'
                              : 'Reconnect required'}
                        </span>
                        {connection.lastRefreshAt ? (
                          <span>
                            Last refresh {new Date(connection.lastRefreshAt).toLocaleString()}
                          </span>
                        ) : null}
                        {connection.lastRefreshError ? <span>{connection.lastRefreshError}</span> : null}
                      </div>
                    </div>
                    {onDisconnect ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled || isBusy}
                        onClick={() => onDisconnect(connection.id)}
                      >
                        Disconnect
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <Button disabled={disabled || isBusy || config.comingSoon} onClick={onConnect}>
          {isConnected ? connectLabel : connectLabel}
        </Button>
      </div>
    </div>
  );
}
