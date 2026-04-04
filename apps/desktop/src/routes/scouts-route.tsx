'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  CreateScoutRequest,
  Scout,
  ScoutRelevanceWindow,
  ScoutScheduleUnit,
  ScoutWeekday,
  UpdateScoutRequest,
} from '@rolodex/types';
import {
  createScout,
  deleteScout,
  getScouts,
  pauseScout,
  resumeScout,
  runScout,
  updateScout,
} from '@/lib/rolodex/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreatableMultiSelect } from '@/components/ui/creatable-multi-select';
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
  { label: 'Sunday', value: 'sunday' },
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
];

const emptyFormState = (): ScoutFormState => ({
  name: '',
  topic: '',
  scheduleUnit: 'day',
  scheduleInterval: '1',
  scheduleDayOfWeek: 'monday',
  scheduleTimeLocal: '09:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  relevanceWindow: 'day',
  recipientEmails: [],
});

const formatTimestamp = (value: string | null) =>
  value ? new Date(value).toLocaleString() : 'Not yet';

const getScoutStatusVariant = (status: Scout['status']) =>
  status === 'active' ? 'default' : 'secondary';

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

export function ScoutsRoute() {
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScoutId, setEditingScoutId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ScoutFormState>(emptyFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [runningScoutId, setRunningScoutId] = useState<string | null>(null);
  const [busyScoutId, setBusyScoutId] = useState<string | null>(null);

  useEffect(() => {
    async function loadScouts() {
      setIsLoading(true);
      setPageError(null);

      try {
        const data = await getScouts();
        setScouts(data);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Failed to load scouts.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadScouts();
  }, []);

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

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingScoutId(null);
    setFormState(emptyFormState());
    setFormError(null);
  };

  const openCreateDialog = () => {
    setEditingScoutId(null);
    setFormState(emptyFormState());
    setFormError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (scout: Scout) => {
    setEditingScoutId(scout.id);
    setFormState(scoutToFormState(scout));
    setFormError(null);
    setIsDialogOpen(true);
  };

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
    setFormError(null);
    setPageMessage(null);
    setIsSaving(true);

    try {
      const payload = buildPayload(formState);
      let savedScout: Scout;

      if (editingScoutId) {
        savedScout = await updateScout(editingScoutId, payload as UpdateScoutRequest);
        setPageMessage('Scout updated.');
      } else {
        savedScout = await createScout(payload);
        setPageMessage('Scout created.');
      }

      upsertScout(savedScout);
      closeDialog();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save scout.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePauseResume = async (scout: Scout) => {
    setBusyScoutId(scout.id);
    setPageMessage(null);
    setPageError(null);

    try {
      const nextScout = scout.status === 'active' ? await pauseScout(scout.id) : await resumeScout(scout.id);
      upsertScout(nextScout);
      setPageMessage(scout.status === 'active' ? 'Scout paused.' : 'Scout resumed.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update scout status.');
    } finally {
      setBusyScoutId(null);
    }
  };

  const handleDelete = async (scout: Scout) => {
    setBusyScoutId(scout.id);
    setPageMessage(null);
    setPageError(null);

    try {
      await deleteScout(scout.id);
      setScouts((current) => current.filter((item) => item.id !== scout.id));
      setPageMessage('Scout deleted.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to delete scout.');
    } finally {
      setBusyScoutId(null);
    }
  };

  const handleRunNow = async (scout: Scout) => {
    setRunningScoutId(scout.id);
    setPageMessage(null);
    setPageError(null);

    try {
      await runScout(scout.id);
      setPageMessage(`Scout "${scout.name}" queued.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to queue scout run.');
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
            <p className="max-w-2xl text-sm text-muted-foreground">
              Create recurring research scouts that search the web, summarize what changed, and
              email the result to the people you choose.
            </p>
          </div>
          <Button onClick={openCreateDialog}>New Scout</Button>
        </div>

        {pageError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {pageError}
          </div>
        ) : null}

        {pageMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {pageMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : orderedScouts.length > 0 ? (
          <div className="space-y-4">
            {orderedScouts.map((scout) => {
              const isBusy = busyScoutId === scout.id;
              const isRunning = runningScoutId === scout.id;

              return (
                <div
                  key={scout.id}
                  className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-slate-950">{scout.name}</h2>
                        <Badge variant={getScoutStatusVariant(scout.status)}>{scout.status}</Badge>
                        <Badge variant="outline">
                          {scout.scheduleInterval} {scout.scheduleUnit}
                          {scout.scheduleInterval === 1 ? '' : 's'}
                        </Badge>
                        <Badge variant="outline">Last {scout.relevanceWindow}</Badge>
                      </div>
                      <p className="max-w-3xl text-sm leading-6 text-slate-600">{scout.topic}</p>
                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <div className="font-medium text-slate-900">Recipients</div>
                          <div>{scout.recipientEmails.join(', ')}</div>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">Next run</div>
                          <div>{formatTimestamp(scout.nextRunAt)}</div>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">Last success</div>
                          <div>{formatTimestamp(scout.lastSuccessAt)}</div>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">Last failure</div>
                          <div>{scout.lastFailureReason || 'None'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button
                        variant="outline"
                        onClick={() => handleRunNow(scout)}
                        disabled={isRunning}
                      >
                        {isRunning ? 'Running…' : 'Run now'}
                      </Button>
                      <Button variant="outline" onClick={() => openEditDialog(scout)} disabled={isBusy}>
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handlePauseResume(scout)}
                        disabled={isBusy}
                      >
                        {scout.status === 'active' ? 'Pause' : 'Resume'}
                      </Button>
                      <Button variant="destructive" onClick={() => handleDelete(scout)} disabled={isBusy}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-950">No scouts yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Start with a topic, choose a cadence, and send the digest wherever you need it.
            </p>
            <Button className="mt-6" onClick={openCreateDialog}>
              Create your first scout
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingScoutId ? 'Edit scout' : 'Create scout'}</DialogTitle>
            <DialogDescription>
              Configure the research topic, cadence, lookback window, and recipients.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="scout-name">Name</Label>
                <Input
                  id="scout-name"
                  value={formState.name}
                  onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                  placeholder="AI chip market scout"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="scout-topic">Topic</Label>
                <Textarea
                  id="scout-topic"
                  value={formState.topic}
                  onChange={(event) => setFormState((current) => ({ ...current, topic: event.target.value }))}
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
                    setFormState((current) => ({ ...current, scheduleInterval: event.target.value }))
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
                <Input
                  id="schedule-time"
                  type="time"
                  value={formState.scheduleTimeLocal}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, scheduleTimeLocal: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formState.timezone}
                  onChange={(event) => setFormState((current) => ({ ...current, timezone: event.target.value }))}
                  placeholder="America/Toronto"
                />
              </div>

              <div className="space-y-2">
                <Label>Content relevance</Label>
                <Select
                  value={formState.relevanceWindow}
                  onValueChange={(value: ScoutRelevanceWindow) =>
                    setFormState((current) => ({ ...current, relevanceWindow: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose window" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Last day</SelectItem>
                    <SelectItem value="week">Last week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Recipients</Label>
                <CreatableMultiSelect
                  options={[]}
                  values={formState.recipientEmails}
                  onChange={(values) => setFormState((current) => ({ ...current, recipientEmails: values }))}
                  placeholder="Add recipient emails"
                  searchPlaceholder="Type an email..."
                  emptyText="No recipients added yet."
                  createLabel={(query) => `Add ${query.trim()}`}
                />
              </div>
            </div>

            {formError ? <div className="text-sm text-destructive">{formError}</div> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : editingScoutId ? 'Save changes' : 'Create scout'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
