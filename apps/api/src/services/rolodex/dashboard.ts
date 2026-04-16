import { prisma } from '@rolodex/db';
import type { DashboardSummary } from '@rolodex/types';
import { ensureRoleCompaniesBackfilled } from './company';
import { listRequests } from './request';

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  await ensureRoleCompaniesBackfilled(userId);

  const [peopleCount, companiesCount, scoutsCount, syncCursor, scout, asks, favours] =
    await Promise.all([
      prisma.person.count({
        where: {
          userId,
          deletedAt: null,
        },
      }),
      prisma.company.count({
        where: {
          userId,
          deletedAt: null,
        },
      }),
      prisma.scout.count({
        where: {
          userId,
          deletedAt: null,
        },
      }),
      prisma.userSyncCursor.findFirst({
        where: { userId },
        orderBy: [{ lastSuccessAt: 'desc' }, { updatedAt: 'desc' }],
      }),
      prisma.scout.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: [{ lastSuccessAt: 'desc' }, { updatedAt: 'desc' }],
      }),
      listRequests(userId, { type: 'ASK', completed: false }),
      listRequests(userId, { type: 'FAVOUR', completed: false }),
    ]);

  const timestamps = [syncCursor?.lastSuccessAt, scout?.lastSuccessAt]
    .filter((value): value is Date => value instanceof Date)
    .sort((left, right) => right.getTime() - left.getTime());

  return {
    peopleCount,
    companiesCount,
    scoutsCount,
    lastUpdateAt: timestamps[0]?.toISOString() ?? null,
    requests: {
      asks,
      favours,
    },
  };
}
