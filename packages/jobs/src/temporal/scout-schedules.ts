import { ScheduleNotFoundError, ScheduleOverlapPolicy } from '@temporalio/client';
import { prisma, ScoutStatus } from '@rolodex/db';
import type { Scout as DbScout } from '@rolodex/db';
import type { Scout } from '@rolodex/types';
import { buildScoutCron, getNextScoutRunAt } from '../schedules/scouts';
import {
  EXECUTE_SCOUT_WORKFLOW,
  getManualScoutWorkflowId,
  getScheduledScoutWorkflowId,
  getScoutScheduleId,
  SCOUTS_TASK_QUEUE,
} from '../workflows';
import { getTemporalClient, getTemporalScheduleClient } from './client';

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
    scheduleId: record.scheduleId,
    nextRunAt: record.nextRunAt?.toISOString() ?? null,
    lastRunAt: record.lastRunAt?.toISOString() ?? null,
    lastSuccessAt: record.lastSuccessAt?.toISOString() ?? null,
    lastFailureAt: record.lastFailureAt?.toISOString() ?? null,
    lastFailureReason: record.lastFailureReason,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function getDesiredScoutScheduleId(scout: Scout) {
  return scout.scheduleId ?? getScoutScheduleId(scout.id);
}

export async function syncScoutTemporalSchedule(scout: Scout) {
  const scheduleClient = await getTemporalScheduleClient();
  const scheduleId = getDesiredScoutScheduleId(scout);
  const cron = buildScoutCron(scout.scheduleUnit, scout.scheduleDayOfWeek, scout.scheduleTimeLocal);

  const definition = {
    spec: {
      cronExpressions: [cron],
      timezone: scout.timezone,
    },
    action: {
      type: 'startWorkflow' as const,
      workflowType: EXECUTE_SCOUT_WORKFLOW,
      taskQueue: SCOUTS_TASK_QUEUE,
      args: [
        {
          scoutId: scout.id,
          trigger: 'scheduled' as const,
        },
      ],
      workflowId: getScheduledScoutWorkflowId(scout.id),
    },
    policies: {
      overlap: ScheduleOverlapPolicy.SKIP,
    },
    state: {
      paused: scout.status !== 'active',
      note:
        scout.status === 'active'
          ? 'Managed by @rolodex/jobs'
          : 'Managed by @rolodex/jobs (paused)',
    },
  };

  try {
    await scheduleClient.getHandle(scheduleId).update(() => definition);
  } catch (error) {
    if (!(error instanceof ScheduleNotFoundError)) {
      throw error;
    }

    await scheduleClient.create({
      scheduleId,
      ...definition,
      memo: {
        source: 'rolodex.jobs.scout',
        scoutId: scout.id,
      },
    });
  }

  return scheduleId;
}

export async function deleteScoutTemporalSchedule(scheduleId: string | null) {
  if (!scheduleId) {
    return;
  }

  const scheduleClient = await getTemporalScheduleClient();

  try {
    await scheduleClient.getHandle(scheduleId).delete();
  } catch (error) {
    if (!(error instanceof ScheduleNotFoundError)) {
      throw error;
    }
  }
}

export async function pauseScoutTemporalSchedule(scheduleId: string | null) {
  if (!scheduleId) {
    return;
  }

  const scheduleClient = await getTemporalScheduleClient();

  try {
    await scheduleClient.getHandle(scheduleId).pause('Managed by @rolodex/jobs');
  } catch (error) {
    if (!(error instanceof ScheduleNotFoundError)) {
      throw error;
    }
  }
}

export async function resumeScoutTemporalSchedule(scheduleId: string | null) {
  if (!scheduleId) {
    return;
  }

  const scheduleClient = await getTemporalScheduleClient();

  try {
    await scheduleClient.getHandle(scheduleId).unpause('Managed by @rolodex/jobs');
  } catch (error) {
    if (!(error instanceof ScheduleNotFoundError)) {
      throw error;
    }
  }
}

export async function runScoutTemporalNow(scoutId: string) {
  const client = await getTemporalClient();

  await client.workflow.start(EXECUTE_SCOUT_WORKFLOW, {
    taskQueue: SCOUTS_TASK_QUEUE,
    workflowId: getManualScoutWorkflowId(scoutId),
    args: [
      {
        scoutId,
        trigger: 'manual',
      },
    ],
  });
}

export async function reconcileScoutSchedules() {
  const scheduleClient = await getTemporalScheduleClient();
  const records = await prisma.scout.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [{ createdAt: 'asc' }],
  });

  const activeScheduleIds = new Set<string>();

  for (const record of records) {
    const scout = mapScout(record);
    const scheduleId = await syncScoutTemporalSchedule(scout);
    activeScheduleIds.add(scheduleId);

    const nextRunAt = scout.status === 'active' ? getNextScoutRunAt(scout) : null;
    if (record.scheduleId !== scheduleId || record.nextRunAt?.getTime() !== nextRunAt?.getTime()) {
      await prisma.scout.update({
        where: { id: record.id },
        data: {
          scheduleId,
          nextRunAt,
        },
      });
    }
  }

  for await (const schedule of scheduleClient.list()) {
    if (!schedule.scheduleId.startsWith('scout:')) {
      continue;
    }

    if (activeScheduleIds.has(schedule.scheduleId)) {
      continue;
    }

    await deleteScoutTemporalSchedule(schedule.scheduleId);
  }
}
