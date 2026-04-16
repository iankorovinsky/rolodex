'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Clock3,
  HandHeart,
  MessageSquare,
  Sparkles,
  Telescope,
  Users,
} from 'lucide-react';
import type { DashboardSummary, Request } from '@rolodex/types';
import { SortableRequestList } from '@/components/dashboard/sortable-request-list';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getDashboardSummary,
  reorderRequests as reorderRequestsApi,
  updateRequest,
} from '@/lib/rolodex/api';

const formatLastUpdate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : 'Awaiting first sync';

function DashboardSection({
  eyebrow,
  title,
  description,
  children,
  className = '',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-border/70 bg-card/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)] ${className}`}
    >
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DashboardMetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-background/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Total
          </span>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/70 p-2 text-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <span className="text-4xl font-semibold tracking-tight">{value}</span>
    </div>
  );
}

function DashboardQueueCard({
  title,
  count,
  icon: Icon,
  description,
}: {
  title: string;
  count: number;
  icon: typeof MessageSquare;
  description: string;
}) {
  const hasItems = count > 0;

  return (
    <div className="rounded-[24px] border border-border/70 bg-background/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/70 p-2 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tracking-tight">{count}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {hasItems ? 'Open items' : 'Clear'}
          </p>
        </div>
        <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {hasItems ? 'Needs attention' : 'Nothing waiting'}
        </div>
      </div>
    </div>
  );
}

export function DashboardRoute() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getDashboardSummary();
        if (!isCancelled) {
          setSummary(data);
        }
      } catch (nextError) {
        if (!isCancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load dashboard.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      isCancelled = true;
    };
  }, []);

  const asks = useMemo(() => summary?.requests.asks ?? [], [summary]);
  const favours = useMemo(() => summary?.requests.favours ?? [], [summary]);
  const openRequestCount = asks.length + favours.length;

  const updateSummaryRequests = (
    type: 'asks' | 'favours',
    updater: (items: Request[]) => Request[]
  ) => {
    setSummary((current) =>
      current
        ? {
            ...current,
            requests: {
              ...current.requests,
              [type]: updater(current.requests[type]),
            },
          }
        : current
    );
  };

  const handleUpdateRequest = async (type: 'asks' | 'favours', id: string, description: string) => {
    const updated = await updateRequest(id, { description });
    updateSummaryRequests(type, (items) => items.map((item) => (item.id === id ? updated : item)));
  };

  const handleToggleRequest = async (type: 'asks' | 'favours', id: string, completed: boolean) => {
    const updated = await updateRequest(id, { completed });
    updateSummaryRequests(type, (items) =>
      items.map((item) => (item.id === id ? updated : item)).filter((item) => !item.completed)
    );
  };

  const handleReorderRequests = async (type: 'asks' | 'favours', ids: string[]) => {
    const reordered = await reorderRequestsApi({ ids });
    updateSummaryRequests(type, () => reordered.filter((item) => !item.completed));
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-32 animate-pulse rounded-[30px] bg-muted" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-[28px] bg-muted" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="h-[320px] animate-pulse rounded-[30px] bg-muted" />
            <div className="h-[520px] animate-pulse rounded-[30px] bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-destructive/25 bg-destructive/5 p-8">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error ?? 'Dashboard unavailable.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-border/70 bg-card/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Relationships, without the visual noise.
              </h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-[15px]">
                Keep the high-signal stuff close: who is in your network, what is still open, and
                what needs follow-through next.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-border/70 bg-background/80 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>Last sync</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-6">
                  {formatLastUpdate(summary.lastUpdateAt)}
                </p>
              </div>

              <div className="rounded-[22px] border border-border/70 bg-background/80 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Open loops</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-6">
                  {openRequestCount === 0
                    ? 'Nothing pending right now.'
                    : `${openRequestCount} asks and favours still in motion.`}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <DashboardMetricCard label="People" value={summary.peopleCount} icon={Users} />
          <DashboardMetricCard label="Companies" value={summary.companiesCount} icon={Building2} />
          <DashboardMetricCard label="Scouts" value={summary.scoutsCount} icon={Telescope} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
          <DashboardSection
            eyebrow="Overview"
            title="What needs your attention"
            description="A quieter summary of your current network state, without the fake sync-theater."
          >
            <div className="grid gap-4">
              <DashboardQueueCard
                title="Asks"
                count={asks.length}
                icon={MessageSquare}
                description="Requests you are waiting on from other people."
              />
              <DashboardQueueCard
                title="Favours"
                count={favours.length}
                icon={HandHeart}
                description="Commitments you still owe and should probably clear."
              />
            </div>
          </DashboardSection>

          <DashboardSection
            eyebrow="Open loops"
            title="Asks and favours"
            description="Inline edit, mark complete, and drag to reprioritize."
          >
            <ScrollArea className="h-[560px] pr-3">
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-[24px] border border-border/70 bg-background/75 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Asks
                      </h3>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {asks.length}
                    </span>
                  </div>
                  <SortableRequestList
                    items={asks}
                    emptyMessage="No open asks."
                    onUpdate={(id, description) => handleUpdateRequest('asks', id, description)}
                    onToggle={(id, completed) => handleToggleRequest('asks', id, completed)}
                    onReorder={(ids) => handleReorderRequests('asks', ids)}
                  />
                </div>

                <div className="rounded-[24px] border border-border/70 bg-background/75 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <HandHeart className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Favours
                      </h3>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {favours.length}
                    </span>
                  </div>
                  <SortableRequestList
                    items={favours}
                    emptyMessage="No open favours."
                    onUpdate={(id, description) => handleUpdateRequest('favours', id, description)}
                    onToggle={(id, completed) => handleToggleRequest('favours', id, completed)}
                    onReorder={(ids) => handleReorderRequests('favours', ids)}
                  />
                </div>
              </div>
            </ScrollArea>
          </DashboardSection>
        </div>
      </div>
    </div>
  );
}
