'use client';

import { Calendar, Mail, MessageSquare, NotebookTabs } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IntegrationConfig, IntegrationConnection, IntegrationType } from '@rolodex/types';

const integrationIcons: Record<IntegrationType, typeof MessageSquare> = {
  imessage: MessageSquare,
  google: Calendar,
  outlook: Mail,
  granola: NotebookTabs,
};

interface IntegrationCardProps {
  config: IntegrationConfig;
  connection?: IntegrationConnection;
  connectLabel?: string;
  disabled?: boolean;
  helperText?: string;
  isBusy?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function IntegrationCard({
  config,
  connection,
  connectLabel = 'Connect',
  disabled = false,
  helperText,
  isBusy = false,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const Icon = integrationIcons[config.type];
  const isConnected = connection?.connected ?? false;

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl border"
            style={{ backgroundColor: `${config.color}14`, color: config.color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{config.label}</h3>
              <Badge
                variant="outline"
                className={cn(
                  isConnected && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                  !isConnected && config.comingSoon && 'border-slate-200 bg-slate-50 text-slate-600'
                )}
              >
                {isConnected ? 'Connected' : config.comingSoon ? 'Coming soon' : 'Available'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
            {connection?.accountLabel ? (
              <p className="text-sm text-foreground">{connection.accountLabel}</p>
            ) : null}
            {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
          </div>
        </div>

        {isConnected ? (
          <Button variant="outline" disabled={disabled || isBusy} onClick={onDisconnect}>
            Disconnect
          </Button>
        ) : (
          <Button disabled={disabled || isBusy || config.comingSoon} onClick={onConnect}>
            {connectLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
