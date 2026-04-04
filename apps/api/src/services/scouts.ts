import { prisma, ScoutStatus } from '@rolodex/db';
import type { Scout as DbScout } from '@rolodex/db';
import { configure, schedules } from '@trigger.dev/sdk/v3';
import type { CreateScoutRequest, Scout, UpdateScoutRequest } from '@rolodex/types';
import {
  buildScoutCron,
  executeScheduledScoutTask,
  executeScoutTask,
  getNextScoutRunAt,
} from './scoutTasks';
import { createAppError } from '../utils/errors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

let triggerConfigured = false;

function ensureTriggerConfigured() {
  if (triggerConfigured) {
    return;
  }

  const accessToken = process.env.TRIGGER_SECRET_KEY;
  if (!accessToken) {
    throw createAppError('Missing TRIGGER_SECRET_KEY.', 500);
  }

  configure({
    accessToken,
    baseURL: process.env.TRIGGER_API_URL || 'https://api.trigger.dev',
  });
  triggerConfigured = true;
}

function mapScout(record: DbScout): Scout {
  const recipientEmails = Array.isArray(record.recipientEmails)
    ? record.recipientEmails.filter((value): value is string => typeof value === 'string')
    : [];

  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    topic: record.topic,
    scheduleUnit: record.scheduleUnit.toLowerCase() as Scout['scheduleUnit'],
    scheduleInterval: record.scheduleInterval,
    scheduleDayOfWeek: record.scheduleDayOfWeek
      ? (record.scheduleDayOfWeek.toLowerCase() as Scout['scheduleDayOfWeek'])
      : null,
    scheduleTimeLocal: record.scheduleTimeLocal,
    timezone: record.timezone,
    scheduleAnchorAt: record.scheduleAnchorAt.toISOString(),
    relevanceWindow: record.relevanceWindow.toLowerCase() as Scout['relevanceWindow'],
    recipientEmails,
    status: record.status.toLowerCase() as Scout['status'],
    triggerScheduleId: record.triggerScheduleId,
    nextRunAt: record.nextRunAt?.toISOString() ?? null,
    lastRunAt: record.lastRunAt?.toISOString() ?? null,
    lastSuccessAt: record.lastSuccessAt?.toISOString() ?? null,
    lastFailureAt: record.lastFailureAt?.toISOString() ?? null,
    lastFailureReason: record.lastFailureReason,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function normalizeRecipientEmails(recipientEmails: string[]) {
  const normalized = recipientEmails
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const deduped = Array.from(new Set(normalized));

  if (deduped.length === 0) {
    throw createAppError('At least one recipient email is required.', 400);
  }

  const invalid = deduped.find((email) => !EMAIL_PATTERN.test(email));
  if (invalid) {
    throw createAppError(`Invalid recipient email: ${invalid}`, 400);
  }

  return deduped;
}

function validateScheduleTimeLocal(value: string) {
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    throw createAppError('Schedule time must be in HH:MM format.', 400);
  }
}

function normalizeCreateInput(input: CreateScoutRequest) {
  const name = input.name?.trim();
  const topic = input.topic?.trim();

  if (!name) {
    throw createAppError('Scout name is required.', 400);
  }

  if (!topic) {
    throw createAppError('Scout topic is required.', 400);
  }

  if (!Number.isInteger(input.scheduleInterval) || input.scheduleInterval < 1) {
    throw createAppError('Schedule interval must be a positive integer.', 400);
  }

  validateScheduleTimeLocal(input.scheduleTimeLocal);

  if (input.scheduleUnit === 'week' && !input.scheduleDayOfWeek) {
    throw createAppError('Weekly schedules require a day of week.', 400);
  }

  return {
    name,
    topic,
    scheduleUnit: input.scheduleUnit,
    scheduleInterval: input.scheduleInterval,
    scheduleDayOfWeek: input.scheduleUnit === 'week' ? input.scheduleDayOfWeek ?? null : null,
    scheduleTimeLocal: input.scheduleTimeLocal,
    timezone: input.timezone || 'UTC',
    relevanceWindow: input.relevanceWindow,
    recipientEmails: normalizeRecipientEmails(input.recipientEmails),
  };
}

function normalizeUpdateInput(existing: Scout, input: UpdateScoutRequest) {
  const next: CreateScoutRequest = {
    name: input.name ?? existing.name,
    topic: input.topic ?? existing.topic,
    scheduleUnit: input.scheduleUnit ?? existing.scheduleUnit,
    scheduleInterval: input.scheduleInterval ?? existing.scheduleInterval,
    scheduleDayOfWeek:
      input.scheduleDayOfWeek !== undefined ? input.scheduleDayOfWeek : existing.scheduleDayOfWeek,
    scheduleTimeLocal: input.scheduleTimeLocal ?? existing.scheduleTimeLocal,
    timezone: input.timezone ?? existing.timezone,
    relevanceWindow: input.relevanceWindow ?? existing.relevanceWindow,
    recipientEmails: input.recipientEmails ?? existing.recipientEmails,
  };

  return normalizeCreateInput(next);
}

function isScheduleConfigChange(existing: Scout, next: ReturnType<typeof normalizeCreateInput>) {
  return (
    existing.scheduleUnit !== next.scheduleUnit ||
    existing.scheduleInterval !== next.scheduleInterval ||
    existing.scheduleDayOfWeek !== next.scheduleDayOfWeek ||
    existing.scheduleTimeLocal !== next.scheduleTimeLocal ||
    existing.timezone !== next.timezone
  );
}

async function syncScoutSchedule(scout: Scout) {
  ensureTriggerConfigured();
  const cron = buildScoutCron(scout.scheduleUnit, scout.scheduleDayOfWeek, scout.scheduleTimeLocal);

  if (!scout.triggerScheduleId) {
    const schedule = await schedules.create({
      task: executeScheduledScoutTask.id,
      cron,
      timezone: scout.timezone,
      externalId: `scout:${scout.id}`,
      deduplicationKey: `scout:${scout.id}`,
    });

    return {
      triggerScheduleId: schedule.id,
      nextRunAt: getNextScoutRunAt(scout),
    };
  }

  await schedules.update(scout.triggerScheduleId, {
    task: executeScheduledScoutTask.id,
    cron,
    timezone: scout.timezone,
    externalId: `scout:${scout.id}`,
  });

  return {
    triggerScheduleId: scout.triggerScheduleId,
    nextRunAt: getNextScoutRunAt(scout),
  };
}

async function deactivateScoutSchedule(triggerScheduleId: string | null) {
  if (!triggerScheduleId) {
    return;
  }

  ensureTriggerConfigured();
  await schedules.deactivate(triggerScheduleId);
}

async function activateScoutSchedule(triggerScheduleId: string | null) {
  if (!triggerScheduleId) {
    return;
  }

  ensureTriggerConfigured();
  await schedules.activate(triggerScheduleId);
}

async function deleteScoutSchedule(triggerScheduleId: string | null) {
  if (!triggerScheduleId) {
    return;
  }

  ensureTriggerConfigured();
  await schedules.del(triggerScheduleId);
}

async function getOwnedScoutRecord(userId: string, scoutId: string) {
  const scout = await prisma.scout.findFirst({
    where: {
      id: scoutId,
      userId,
      deletedAt: null,
    },
  });

  if (!scout) {
    throw createAppError('Scout not found.', 404);
  }

  return scout;
}

export async function listScouts(userId: string) {
  const scouts = await prisma.scout.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return scouts.map(mapScout);
}

export async function getScoutById(userId: string, scoutId: string) {
  const scout = await getOwnedScoutRecord(userId, scoutId);
  return mapScout(scout);
}

export async function createScout(userId: string, input: CreateScoutRequest) {
  const normalized = normalizeCreateInput(input);
  const scheduleAnchorAt = new Date();

  const created = await prisma.scout.create({
    data: {
      userId,
      name: normalized.name,
      topic: normalized.topic,
      scheduleUnit: normalized.scheduleUnit.toUpperCase() as DbScout['scheduleUnit'],
      scheduleInterval: normalized.scheduleInterval,
      scheduleDayOfWeek: normalized.scheduleDayOfWeek
        ? (normalized.scheduleDayOfWeek.toUpperCase() as NonNullable<DbScout['scheduleDayOfWeek']>)
        : null,
      scheduleTimeLocal: normalized.scheduleTimeLocal,
      timezone: normalized.timezone,
      scheduleAnchorAt,
      relevanceWindow: normalized.relevanceWindow.toUpperCase() as DbScout['relevanceWindow'],
      recipientEmails: normalized.recipientEmails,
      status: ScoutStatus.ACTIVE,
      nextRunAt: getNextScoutRunAt({
        ...normalized,
        scheduleAnchorAt,
      }),
    },
  });

  const synced = await syncScoutSchedule(mapScout(created));
  const updated = await prisma.scout.update({
    where: { id: created.id },
    data: synced,
  });

  return mapScout(updated);
}

export async function updateScout(userId: string, scoutId: string, input: UpdateScoutRequest) {
  const existingRecord = await getOwnedScoutRecord(userId, scoutId);
  const existing = mapScout(existingRecord);
  const normalized = normalizeUpdateInput(existing, input);
  const scheduleChanged = isScheduleConfigChange(existing, normalized);
  const scheduleAnchorAt = scheduleChanged ? new Date() : new Date(existing.scheduleAnchorAt);

  const updated = await prisma.scout.update({
    where: { id: scoutId },
    data: {
      name: normalized.name,
      topic: normalized.topic,
      scheduleUnit: normalized.scheduleUnit.toUpperCase() as DbScout['scheduleUnit'],
      scheduleInterval: normalized.scheduleInterval,
      scheduleDayOfWeek: normalized.scheduleDayOfWeek
        ? (normalized.scheduleDayOfWeek.toUpperCase() as NonNullable<DbScout['scheduleDayOfWeek']>)
        : null,
      scheduleTimeLocal: normalized.scheduleTimeLocal,
      timezone: normalized.timezone,
      scheduleAnchorAt,
      relevanceWindow: normalized.relevanceWindow.toUpperCase() as DbScout['relevanceWindow'],
      recipientEmails: normalized.recipientEmails,
      nextRunAt:
        existing.status === 'active'
          ? getNextScoutRunAt({
              ...normalized,
              scheduleAnchorAt,
            })
          : null,
    },
  });

  if (updated.status === ScoutStatus.ACTIVE) {
    const synced = await syncScoutSchedule(mapScout(updated));
    const scheduled = await prisma.scout.update({
      where: { id: updated.id },
      data: synced,
    });
    return mapScout(scheduled);
  }

  return mapScout(updated);
}

export async function pauseScout(userId: string, scoutId: string) {
  const scout = await getOwnedScoutRecord(userId, scoutId);
  await deactivateScoutSchedule(scout.triggerScheduleId);

  const updated = await prisma.scout.update({
    where: { id: scout.id },
    data: {
      status: ScoutStatus.PAUSED,
      nextRunAt: null,
    },
  });

  return mapScout(updated);
}

export async function resumeScout(userId: string, scoutId: string) {
  const scout = await getOwnedScoutRecord(userId, scoutId);

  if (!scout.triggerScheduleId) {
    const scheduleAnchorAt = scout.scheduleAnchorAt;
    const resumed = await prisma.scout.update({
      where: { id: scout.id },
      data: {
        status: ScoutStatus.ACTIVE,
        nextRunAt: getNextScoutRunAt({
          ...mapScout(scout),
          scheduleAnchorAt: scheduleAnchorAt.toISOString(),
        }),
      },
    });
    const synced = await syncScoutSchedule(mapScout(resumed));
    const updated = await prisma.scout.update({
      where: { id: resumed.id },
      data: synced,
    });
    return mapScout(updated);
  }

  await activateScoutSchedule(scout.triggerScheduleId);
  const updated = await prisma.scout.update({
    where: { id: scout.id },
    data: {
      status: ScoutStatus.ACTIVE,
      nextRunAt: getNextScoutRunAt(mapScout(scout)),
    },
  });

  return mapScout(updated);
}

export async function deleteScout(userId: string, scoutId: string) {
  const scout = await getOwnedScoutRecord(userId, scoutId);
  await deleteScoutSchedule(scout.triggerScheduleId);

  await prisma.scout.update({
    where: { id: scout.id },
    data: {
      deletedAt: new Date(),
      nextRunAt: null,
      triggerScheduleId: null,
    },
  });
}

export async function runScoutNow(userId: string, scoutId: string) {
  const scout = await getOwnedScoutRecord(userId, scoutId);
  ensureTriggerConfigured();
  await executeScoutTask.trigger({
    scoutId: scout.id,
    trigger: 'manual',
  });

  return { queued: true };
}
