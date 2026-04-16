'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { CommandAction } from '@/commands/types';
import type {
  CreateScoutRequest,
  Scout,
  ScoutRelevanceWindow,
  ScoutScheduleUnit,
  ScoutWeekday,
  UpdateScoutRequest,
} from '@rolodex/types';
import { toast } from 'sonner';
import {
  createScout,
  deleteScout,
  getScouts,
  pauseScout,
  resumeScout,
  runScout,
  updateScout,
} from '@/lib/rolodex/api';
import { Button } from '@/components/ui/button';
import { useRegisterCommandActions } from '@/commands/hooks/use-register-command-actions';
import { ComboboxCreatable } from '@/components/ui/combobox-creatable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Play, PlusIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

type ScoutFormState = {
  name: string;
  topic: string;
  scheduleUnit: ScoutScheduleUnit;
  scheduleInterval: string;
  scheduleDayOfWeek: ScoutWeekday;
  scheduleTimeLocal: string;
  timezone: string;
  relevanceWindow: ScoutRelevanceWindow;
  recipientEmails: string[];
};

const weekdayOptions: Array<{ label: string; value: ScoutWeekday }> = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
];

const timezoneOptions = [
  { label: 'ET (New York)', value: 'America/New_York' },
  { label: 'CT (Chicago)', value: 'America/Chicago' },
  { label: 'MT (Denver)', value: 'America/Denver' },
  { label: 'PT (Los Angeles)', value: 'America/Los_Angeles' },
  { label: 'UTC', value: 'UTC' },
] as const;

const timeOptions = (() => {
  const options: Array<{ value: string; label: string }> = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    const value = `${hh}:${mm}`;

    const date = new Date();
    date.setHours(Number(hh), Number(mm), 0, 0);
    const label = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    options.push({ value, label });
  }
  return options;
})();

const emptyFormState = (): ScoutFormState => ({
  name: '',
  topic: '',
  scheduleUnit: 'day',
  scheduleInterval: '1',
  scheduleDayOfWeek: 'monday',
  scheduleTimeLocal: '09:00',
  timezone: 'America/New_York',
  relevanceWindow: 'week',
  recipientEmails: [],
});

const formatTimestamp = (value: string | null) =>
  value ? new Date(value).toLocaleString() : 'Not yet';

const formatTimestampWithTimezone = (value: string | null, timezone: string) => {
  if (!value) {
    return 'Not yet';
  }

  try {
    return new Date(value).toLocaleString(undefined, {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZoneName: 'short',
    });
  } catch {
    return formatTimestamp(value);
  }
};

function scoutToFormState(scout: Scout): ScoutFormState {
  return {
    name: scout.name,
    topic: scout.topic,
    scheduleUnit: scout.scheduleUnit,
    scheduleInterval: String(scout.scheduleInterval),
    scheduleDayOfWeek: scout.scheduleDayOfWeek ?? 'monday',
    scheduleTimeLocal: scout.scheduleTimeLocal,
    timezone: scout.timezone,
    relevanceWindow: scout.relevanceWindow,
    recipientEmails: scout.recipientEmails,
  };
}

function buildPayload(formState: ScoutFormState): CreateScoutRequest {
  return {
    name: formState.name,
    topic: formState.topic,
    scheduleUnit: formState.scheduleUnit,
    scheduleInterval: Number(formState.scheduleInterval),
    scheduleDayOfWeek: formState.scheduleUnit === 'week' ? formState.scheduleDayOfWeek : null,
    scheduleTimeLocal: formState.scheduleTimeLocal,
    timezone: formState.timezone,
    relevanceWindow: formState.relevanceWindow,
    recipientEmails: formState.recipientEmails,
  };
}

function hasOpenCreateScoutDialogState(
  value: unknown
): value is { openCreateScoutDialog?: boolean } {
  return typeof value === 'object' && value !== null;
}

export function ScoutsRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScoutId, setEditingScoutId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ScoutFormState>(emptyFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [runningScoutId, setRunningScoutId] = useState<string | null>(null);
  const [busyScoutId, setBusyScoutId] = useState<string | null>(null);

  useEffect(() => {
    async function loadScouts() {
      setIsLoading(true);

      try {
        const data = await getScouts();
        setScouts(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load scouts.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadScouts();
  }, []);

  useEffect(() => {
    if (!hasOpenCreateScoutDialogState(location.state) || !location.state.openCreateScoutDialog) {
      return;
    }

    openCreateDialog();
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const orderedScouts = useMemo(
    () =>
      [...scouts].sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'active' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }),
    [scouts]
  );

  const editingScout = useMemo(() => {
    if (!editingScoutId) {
      return null;
    }
    return scouts.find((item) => item.id === editingScoutId) ?? null;
  }, [editingScoutId, scouts]);

  const visibleTimezoneOptions = useMemo(() => {
    if (timezoneOptions.some((option) => option.value === formState.timezone)) {
      return timezoneOptions;
    }
    return [{ label: formState.timezone, value: formState.timezone }, ...timezoneOptions];
  }, [formState.timezone]);

  const visibleTimeOptions = useMemo(() => {
    if (timeOptions.some((option) => option.value === formState.scheduleTimeLocal)) {
      return timeOptions;
    }
    return [{ value: formState.scheduleTimeLocal, label: formState.scheduleTimeLocal }, ...timeOptions];
  }, [formState.scheduleTimeLocal]);

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingScoutId(null);
    setFormState(emptyFormState());
  };

  const openCreateDialog = () => {
    setEditingScoutId(null);
    const nextForm = emptyFormState();
    const defaultRecipient = user?.email?.trim();
    setFormState({
      ...nextForm,
      recipientEmails: defaultRecipient ? [defaultRecipient] : [],
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (scout: Scout) => {
    setEditingScoutId(scout.id);
    setFormState(scoutToFormState(scout));
    setIsDialogOpen(true);
  };

  const commandActions = useMemo<CommandAction[]>(
    () => [
      {
        id: 'page:scouts:new',
        title: 'New Scout',
        subtitle: 'Create a scout from the Scouts page',
        keywords: ['create scout', 'new scout'],
        group: 'page',
        kind: 'action',
        priority: 0,
        perform: openCreateDialog,
      },
      ...orderedScouts.slice(0, 6).flatMap<CommandAction>((scout) => [
        {
          id: `page:scout:run:${scout.id}`,
          title: `Run Scout: ${scout.name}`,
          subtitle: 'Queue this scout immediately',
          keywords: ['run scout', scout.topic],
          group: 'page',
          kind: 'action',
          priority: 20,
          perform: () => handleRunNow(scout),
        },
        {
          id: `page:scout:edit:${scout.id}`,
          title: `Edit Scout: ${scout.name}`,
          subtitle: 'Open the scout editor',
          keywords: ['edit scout', scout.topic],
          group: 'page',
          kind: 'action',
          priority: 30,
          perform: () => openEditDialog(scout),
        },
      ]),
    ],
    [orderedScouts]
  );

  useRegisterCommandActions(commandActions);

  const upsertScout = (nextScout: Scout) => {
    setScouts((current) => {
      const existingIndex = current.findIndex((scout) => scout.id === nextScout.id);
      if (existingIndex === -1) {
        return [nextScout, ...current];
      }

      const copy = [...current];
      copy[existingIndex] = nextScout;
      return copy;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = buildPayload(formState);
      let savedScout: Scout;

      if (editingScoutId) {
        savedScout = await updateScout(editingScoutId, payload as UpdateScoutRequest);
        toast.success('Scout updated.');
      } else {
        savedScout = await createScout(payload);
        toast.success('Scout created.');
      }

      upsertScout(savedScout);
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save scout.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePauseResume = async (scout: Scout) => {
    setBusyScoutId(scout.id);

    try {
      const nextScout =
        scout.status === 'active' ? await pauseScout(scout.id) : await resumeScout(scout.id);
      upsertScout(nextScout);
      toast.success(scout.status === 'active' ? 'Scout paused.' : 'Scout resumed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update scout status.');
    } finally {
      setBusyScoutId(null);
    }
  };

  const handleDelete = async (scout: Scout) => {
    setBusyScoutId(scout.id);

    try {
      await deleteScout(scout.id);
      setScouts((current) => current.filter((item) => item.id !== scout.id));
      toast.success('Scout deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete scout.');
    } finally {
      setBusyScoutId(null);
    }
  };

  const handleRunNow = async (scout: Scout) => {
    setRunningScoutId(scout.id);

    try {
      await runScout(scout.id);
      toast.success(`Scout "${scout.name}" queued.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to queue scout run.');
    } finally {
      setRunningScoutId(null);
    }
  };

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Scouts</h1>
          </div>
          <Button onClick={openCreateDialog}>
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <div key={index} className="min-h-[240px] animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : orderedScouts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedScouts.map((scout) => {
              const isBusy = busyScoutId === scout.id;
              const isRunning = runningScoutId === scout.id;
              const isPaused = scout.status !== 'active';

              const scheduleLabel = (() => {
                const unit = scout.scheduleUnit;
                const interval = scout.scheduleInterval;
                const plural = interval === 1 ? '' : 's';

                if (unit === 'week' && scout.scheduleDayOfWeek) {
                  return `Every ${interval} week${plural} · ${scout.scheduleDayOfWeek} · ${scout.scheduleTimeLocal}`;
                }

                return `Every ${interval} ${unit}${plural} · ${scout.scheduleTimeLocal}`;
              })();

              return (
                <div
                  key={scout.id}
                  className={cn(
                    'group relative min-h-[240px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                    isPaused && 'bg-slate-50 text-slate-500'
                  )}
                >
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleRunNow(scout)}
                      disabled={isRunning}
                      className="text-slate-400 hover:bg-transparent hover:text-slate-700"
                      aria-label="Run now"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => openEditDialog(scout)}
                      disabled={isBusy}
                      className="text-slate-400 hover:bg-transparent hover:text-slate-700"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-4 pr-16">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <h2
                            className={cn(
                              'truncate text-lg font-semibold text-slate-950',
                              isPaused && 'text-slate-700'
                            )}
                          >
                            {scout.name}
                          </h2>
                          <p
                            className={cn(
                              'line-clamp-3 text-sm leading-6 text-slate-600',
                              isPaused && 'text-slate-500'
                            )}
                          >
                            {scout.topic}
                          </p>
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            {scheduleLabel}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Recipients
                          </div>
                          <div className="line-clamp-2">{scout.recipientEmails.join(', ')}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Next run
                          </div>
                          <div className="line-clamp-2">
                            {formatTimestampWithTimezone(scout.nextRunAt, scout.timezone)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-950">No Scouts Yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Let someone else doomscroll for you, while you focus on the bigger picture.
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingScoutId ? 'Edit Scout' : 'Create Scout'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="scout-name">Name</Label>
                <Input
                  id="scout-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="AI chip market scout"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="scout-topic">Topic</Label>
                <Textarea
                  id="scout-topic"
                  value={formState.topic}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, topic: event.target.value }))
                  }
                  placeholder="What should this scout research?"
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Frequency unit</Label>
                <Select
                  value={formState.scheduleUnit}
                  onValueChange={(value: ScoutScheduleUnit) =>
                    setFormState((current) => ({ ...current, scheduleUnit: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Days</SelectItem>
                    <SelectItem value="week">Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-interval">Every</Label>
                <Input
                  id="schedule-interval"
                  type="number"
                  min="1"
                  value={formState.scheduleInterval}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      scheduleInterval: event.target.value,
                    }))
                  }
                />
              </div>

              {formState.scheduleUnit === 'week' ? (
                <div className="space-y-2">
                  <Label>Day of week</Label>
                  <Select
                    value={formState.scheduleDayOfWeek}
                    onValueChange={(value: ScoutWeekday) =>
                      setFormState((current) => ({ ...current, scheduleDayOfWeek: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose day" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekdayOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="schedule-time">Send time</Label>
                <Select
                  value={formState.scheduleTimeLocal}
                  onValueChange={(value: string) =>
                    setFormState((current) => ({ ...current, scheduleTimeLocal: value }))
                  }
                >
                  <SelectTrigger id="schedule-time" className="font-normal">
                    <SelectValue placeholder="Choose time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {visibleTimeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formState.timezone}
                  onValueChange={(value: string) =>
                    setFormState((current) => ({ ...current, timezone: value }))
                  }
                >
                  <SelectTrigger id="timezone" className="font-normal">
                    <SelectValue placeholder="Choose timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleTimezoneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Recipients</Label>
                <ComboboxCreatable
                  options={[]}
                  values={formState.recipientEmails}
                  onChange={(values) =>
                    setFormState((current) => ({ ...current, recipientEmails: values }))
                  }
                  placeholder="Type an email and hit enter…"
                  createLabel={(query) => `Add ${query.trim()}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              {editingScoutId ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!editingScout || busyScoutId === editingScoutId}
                    onClick={() => {
                      if (!editingScout) {
                        return;
                      }
                      void handlePauseResume(editingScout);
                    }}
                  >
                    {editingScout ? (editingScout.status === 'active' ? 'Pause' : 'Resume') : 'Pause'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!editingScout || busyScoutId === editingScoutId}
                    onClick={() => {
                      if (!editingScout) {
                        return;
                      }
                      void handleDelete(editingScout).then(() => closeDialog());
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : editingScoutId ? 'Save changes' : 'Create scout'}
              </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
