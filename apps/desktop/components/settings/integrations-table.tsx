'use client';

import { Fragment, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { IntegrationConnection, IntegrationType } from '@rolodex/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface IntegrationProviderMeta {
  label: string;
  logo: string;
}

export interface IntegrationsTableRow {
  type: IntegrationType;
  meta: IntegrationProviderMeta;
  connections: IntegrationConnection[];
  isBusy: boolean;
  manageLabel?: string;
  summaryLabel?: string;
  emptyState?: string;
  expandedContent?: React.ReactNode;
  statusOverride?: {
    label: string;
    className: string;
  };
  onManage: () => void;
  /** When true, the primary action (Connect / etc.) is disabled. */
  manageDisabled?: boolean;
  onDisconnect?: (connection: IntegrationConnection) => void;
}

interface IntegrationsTableProps {
  rows: IntegrationsTableRow[];
  /** True until the first integrations fetch completes (avoids flashing “Not connected” then “Connected”). */
  isLoading?: boolean;
  /** Rows expanded on first render (e.g. onboarding previews). */
  initialOpenRows?: IntegrationType[];
}

function getConnectionStateMeta(connections: IntegrationConnection[]) {
  const hasReconnectRequired = connections.some(
    (connection) => connection.connectionStatus === 'reconnect_required'
  );
  const hasRefreshFailure = connections.some(
    (connection) => connection.connectionStatus === 'refresh_failed'
  );

  if (hasReconnectRequired) {
    return {
      label: 'Needs attention',
      className:
        'border-red-500/25 bg-red-500/10 text-red-800 dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-300',
    };
  }

  if (hasRefreshFailure) {
    return {
      label: 'Checking required',
      className:
        'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200',
    };
  }

  if (connections.length > 0) {
    return {
      label: 'Connected',
      className:
        'border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300',
    };
  }

  return {
    label: 'Not Connected',
    className:
      'border-border bg-muted/80 text-muted-foreground dark:bg-muted/50 dark:text-muted-foreground',
  };
}

function IntegrationProviderBadge({
  connections,
  override,
}: {
  connections: IntegrationConnection[];
  override?: {
    label: string;
    className: string;
  };
}) {
  const state = override ?? getConnectionStateMeta(connections);

  return (
    <Badge variant="outline" className={cn('rounded-full px-2.5 py-1 text-xs', state.className)}>
      {state.label}
    </Badge>
  );
}

function IntegrationProviderLogo({ logo, label }: { logo: string; label: string }) {
  return (
    <div className="size-10 shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <img src={logo} alt={`${label} logo`} className="block size-full object-cover" />
    </div>
  );
}

function connectionStatusMeta(connection: IntegrationConnection) {
  return connection.connectionStatus === 'reconnect_required'
    ? {
        label: 'Reconnect required',
        className:
          'border-red-500/25 bg-red-500/10 text-red-800 dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-300',
      }
    : connection.connectionStatus === 'refresh_failed'
      ? {
          label: 'Refresh failed',
          className:
            'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200',
        }
      : {
          label: 'Active',
          className:
            'border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300',
        };
}

function ConnectionSubRow({
  connection,
  onDisconnect,
  isBusy,
}: {
  connection: IntegrationConnection;
  onDisconnect?: (connection: IntegrationConnection) => void;
  isBusy: boolean;
}) {
  const statusMeta = connectionStatusMeta(connection);
  const primary =
    connection.accountEmail ??
    connection.accountLabel ??
    connection.externalAccountId ??
    'Connected account';

  return (
    <TableRow className="group border-b border-border bg-muted/30 hover:bg-muted/40">
      <TableCell className="py-3">
        <div className="truncate text-sm text-foreground">{primary}</div>
      </TableCell>
      <TableCell className="py-3 pl-2">
        <Badge
          variant="outline"
          className={cn('rounded-full px-2.5 py-1 text-xs', statusMeta.className)}
        >
          {statusMeta.label}
        </Badge>
      </TableCell>
      <TableCell className="py-3 text-sm text-muted-foreground" />
      <TableCell className="py-3 text-right align-middle">
        {onDisconnect ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            disabled={isBusy}
            aria-label="Disconnect account"
            onClick={(event) => {
              event.stopPropagation();
              onDisconnect(connection);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function IntegrationsTable({
  rows,
  isLoading = false,
  initialOpenRows,
}: IntegrationsTableProps) {
  const [openRows, setOpenRows] = useState<IntegrationType[]>(() => initialOpenRows ?? []);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.type} className="flex items-center gap-4 px-4 py-4 sm:px-5" aria-hidden>
              <div className="size-10 shrink-0 animate-pulse rounded-2xl bg-slate-200 dark:bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-28 max-w-full animate-pulse rounded bg-slate-200 dark:bg-muted" />
                <div className="h-3 w-40 max-w-full animate-pulse rounded bg-slate-100 dark:bg-muted/60" />
              </div>
              <div className="h-8 w-24 shrink-0 animate-pulse rounded-md bg-slate-200 dark:bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table className="table-fixed">
        <colgroup>
          <col className="w-[36%] min-w-0" />
          <col className="w-[168px]" />
          <col className="w-[108px]" />
          <col className="w-[118px]" />
        </colgroup>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Integration</TableHead>
            <TableHead className="pl-2">Status</TableHead>
            <TableHead>Accounts</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isOpen = openRows.includes(row.type);

            const toggleRow = () => {
              setOpenRows((current) =>
                isOpen ? current.filter((item) => item !== row.type) : [...current, row.type]
              );
            };

            return (
              <Fragment key={row.type}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/40"
                  aria-expanded={isOpen}
                  onClick={toggleRow}
                >
                  <TableCell>
                    <div className="flex items-center gap-4 py-1">
                      <IntegrationProviderLogo logo={row.meta.logo} label={row.meta.label} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{row.meta.label}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="pl-2">
                    <IntegrationProviderBadge
                      connections={row.connections}
                      override={row.statusOverride}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.summaryLabel ??
                      (row.connections.length > 0 ? row.connections.length : 'Not Connected')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      disabled={row.isBusy || row.manageDisabled}
                      onClick={(event) => {
                        event.stopPropagation();
                        row.onManage();
                      }}
                    >
                      {row.manageLabel ?? 'Connect'}
                    </Button>
                  </TableCell>
                </TableRow>

                {isOpen && row.expandedContent ? (
                  <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={4} className="p-0">
                      {row.expandedContent}
                    </TableCell>
                  </TableRow>
                ) : null}
                {isOpen && !row.expandedContent && row.connections.length > 0
                  ? row.connections.map((connection) => (
                      <ConnectionSubRow
                        key={connection.id}
                        connection={connection}
                        onDisconnect={row.onDisconnect}
                        isBusy={row.isBusy}
                      />
                    ))
                  : null}
                {isOpen && !row.expandedContent && row.connections.length === 0 ? (
                  <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={4} className="py-4 text-sm text-muted-foreground">
                      {row.emptyState ?? 'No accounts connected yet.'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
