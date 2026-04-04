import { beforeEach, describe, expect, it, mock } from 'bun:test';

const scoutCreate = mock();
const scoutFindFirst = mock();

const scheduleCreate = mock();
const scheduleActivate = mock();
const taskTrigger = mock();

mock.module('@rolodex/db', () => ({
  ScoutStatus: {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
  },
  prisma: {
    scout: {
      create: scoutCreate,
      findFirst: scoutFindFirst,
    },
  },
}));

mock.module('@trigger.dev/sdk/v3', () => ({
  configure: mock(),
  schedules: {
    create: scheduleCreate,
    activate: scheduleActivate,
    deactivate: mock(),
    del: mock(),
    update: mock(),
  },
}));

mock.module('../src/services/scoutTasks', () => ({
  buildScoutCron: () => '0 9 * * *',
  getNextScoutRunAt: () => new Date('2026-04-03T13:00:00.000Z'),
  executeScheduledScoutTask: {
    id: 'scout-execute-scheduled',
  },
  executeScoutTask: {
    trigger: taskTrigger,
  },
}));

import { createScout, runScoutNow } from '../src/services/scouts';

describe('scout services', () => {
  beforeEach(() => {
    scoutCreate.mockReset();
    scoutFindFirst.mockReset();
    scheduleCreate.mockReset();
    scheduleActivate.mockReset();
    taskTrigger.mockReset();
    process.env.TRIGGER_SECRET_KEY = 'tr_dev_test';
    process.env.TRIGGER_API_URL = 'https://api.trigger.dev';
  });

  it('validates recipient emails on create', async () => {
    await expect(
      createScout('user-1', {
        name: 'Scout',
        topic: 'AI market updates',
        scheduleUnit: 'day',
        scheduleInterval: 1,
        scheduleTimeLocal: '09:00',
        timezone: 'America/Toronto',
        relevanceWindow: 'day',
        recipientEmails: ['not-an-email'],
      })
    ).rejects.toThrow('Invalid recipient email');
  });

  it('queues a manual run for a paused scout', async () => {
    scoutFindFirst.mockResolvedValue({
      id: 'scout-1',
      userId: 'user-1',
      name: 'Scout',
      topic: 'AI market updates',
      scheduleUnit: 'DAY',
      scheduleInterval: 1,
      scheduleDayOfWeek: null,
      scheduleTimeLocal: '09:00',
      timezone: 'America/Toronto',
      scheduleAnchorAt: new Date('2026-04-02T12:00:00.000Z'),
      relevanceWindow: 'DAY',
      recipientEmails: ['ops@example.com'],
      status: 'PAUSED',
      triggerScheduleId: 'schedule-1',
      nextRunAt: null,
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastFailureReason: null,
      createdAt: new Date('2026-04-02T12:00:00.000Z'),
      updatedAt: new Date('2026-04-02T12:00:00.000Z'),
      deletedAt: null,
    });
    taskTrigger.mockResolvedValue(undefined);

    const result = await runScoutNow('user-1', 'scout-1');

    expect(result).toEqual({ queued: true });
    expect(taskTrigger).toHaveBeenCalledWith({
      scoutId: 'scout-1',
      trigger: 'manual',
    });
  });
});
