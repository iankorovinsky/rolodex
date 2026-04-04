import { prisma, ScoutStatus } from '@rolodex/db';
import type { Scout } from '@rolodex/types';
import { cohereSummaryProvider, resendEmailProvider, tavilyResearchProvider } from './providers';
import { getNextScoutRunAt, isScoutDueAt } from './schedule';
import type { ScoutExecutionPayload } from './task';

function mapScout(record: Awaited<ReturnType<typeof prisma.scout.findUniqueOrThrow>>): Scout {
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

export async function executeScout(payload: ScoutExecutionPayload) {
  const record = await prisma.scout.findUniqueOrThrow({
    where: { id: payload.scoutId },
  });

  if (record.deletedAt) {
    return { skipped: true, reason: 'deleted' };
  }

  if (payload.trigger === 'scheduled' && record.status !== ScoutStatus.ACTIVE) {
    return { skipped: true, reason: 'paused' };
  }

  const scout = mapScout(record);

  if (payload.trigger === 'scheduled' && !isScoutDueAt(scout, new Date())) {
    return { skipped: true, reason: 'off-cadence' };
  }

  const now = new Date();

  try {
    const sources = await tavilyResearchProvider.searchForScout({
      topic: scout.topic,
      relevanceWindow: scout.relevanceWindow,
    });
    const digest = await cohereSummaryProvider.summarizeScoutDigest({
      scout,
      sources,
    });

    await resendEmailProvider.sendScoutDigest({
      scout,
      recipients: scout.recipientEmails,
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
    });

    await prisma.scout.update({
      where: { id: scout.id },
      data: {
        lastRunAt: now,
        lastSuccessAt: now,
        lastFailureAt: null,
        lastFailureReason: null,
        nextRunAt:
          payload.trigger === 'scheduled' && scout.status === 'active'
            ? getNextScoutRunAt(scout, now)
            : record.nextRunAt,
      },
    });

    return {
      skipped: false,
      sent: true,
      sourceCount: sources.length,
    };
  } catch (error) {
    await prisma.scout.update({
      where: { id: scout.id },
      data: {
        lastRunAt: now,
        lastFailureAt: now,
        lastFailureReason: error instanceof Error ? error.message : 'Unknown scout execution error.',
        nextRunAt:
          payload.trigger === 'scheduled' && scout.status === 'active'
            ? getNextScoutRunAt(scout, now)
            : record.nextRunAt,
      },
    });

    throw error;
  }
}
