import { beforeEach, describe, expect, it, mock } from 'bun:test';

const scoutFindUniqueOrThrow = mock();
const scoutUpdate = mock();

const searchForScout = mock();
const summarizeScoutDigest = mock();
const sendScoutDigest = mock();

mock.module('@rolodex/db', () => ({
  ScoutStatus: {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
  },
  prisma: {
    scout: {
      findUniqueOrThrow: scoutFindUniqueOrThrow,
      update: scoutUpdate,
    },
  },
}));

mock.module('./providers', () => ({
  tavilyResearchProvider: {
    searchForScout,
  },
  cohereSummaryProvider: {
    summarizeScoutDigest,
  },
  resendEmailProvider: {
    sendScoutDigest,
  },
}));

import { executeScout } from './executor';

const baseScoutRecord = {
  id: 'scout-1',
  userId: 'user-1',
  name: 'AI chips',
  topic: 'AI chips',
  scheduleUnit: 'DAY',
  scheduleInterval: 1,
  scheduleDayOfWeek: null,
  scheduleTimeLocal: '09:00',
  timezone: 'America/Toronto',
  scheduleAnchorAt: new Date('2026-04-02T12:00:00.000Z'),
  relevanceWindow: 'DAY',
  recipientEmails: ['team@example.com'],
  status: 'ACTIVE',
  scheduleId: 'schedule-1',
  nextRunAt: new Date('2026-04-03T13:00:00.000Z'),
  lastRunAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastFailureReason: null,
  createdAt: new Date('2026-04-02T12:00:00.000Z'),
  updatedAt: new Date('2026-04-02T12:00:00.000Z'),
  deletedAt: null,
};

describe('executeScout', () => {
  beforeEach(() => {
    scoutFindUniqueOrThrow.mockReset();
    scoutUpdate.mockReset();
    searchForScout.mockReset();
    summarizeScoutDigest.mockReset();
    sendScoutDigest.mockReset();
  });

  it('skips scheduled runs for paused scouts', async () => {
    scoutFindUniqueOrThrow.mockResolvedValue({
      ...baseScoutRecord,
      status: 'PAUSED',
    });

    const result = await executeScout({
      scoutId: 'scout-1',
      trigger: 'scheduled',
    });

    expect(result).toEqual({
      skipped: true,
      reason: 'paused',
    });
    expect(searchForScout).not.toHaveBeenCalled();
    expect(scoutUpdate).not.toHaveBeenCalled();
  });

  it('allows manual runs for paused scouts and persists success', async () => {
    scoutFindUniqueOrThrow.mockResolvedValue({
      ...baseScoutRecord,
      status: 'PAUSED',
    });
    searchForScout.mockResolvedValue([
      {
        title: 'Source',
        url: 'https://example.com',
        content: 'Summary',
        publishedAt: '2026-04-02T12:00:00.000Z',
      },
    ]);
    summarizeScoutDigest.mockResolvedValue({
      subject: 'Scout digest',
      html: '<p>Digest</p>',
      text: 'Digest',
    });
    sendScoutDigest.mockResolvedValue(undefined);
    scoutUpdate.mockResolvedValue(undefined);

    const result = await executeScout({
      scoutId: 'scout-1',
      trigger: 'manual',
    });

    expect(result).toEqual({
      skipped: false,
      sent: true,
      sourceCount: 1,
    });
    expect(sendScoutDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: ['team@example.com'],
        subject: 'Scout digest',
      })
    );
    expect(scoutUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'scout-1' },
        data: expect.objectContaining({
          lastSuccessAt: expect.any(Date),
        }),
      })
    );
  });
});
