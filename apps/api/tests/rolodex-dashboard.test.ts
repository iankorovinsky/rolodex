import { beforeEach, describe, expect, it, mock } from 'bun:test';

const companyFindFirst = mock();
const companyCreate = mock();
const companyUpdate = mock();
const requestFindMany = mock();
const requestUpdate = mock();
const requestAggregate = mock();
const personCount = mock();
const companyCount = mock();
const scoutCount = mock();
const userSyncCursorFindFirst = mock();
const scoutFindFirst = mock();
const roleFindMany = mock();
const roleUpdate = mock();

const transactionMock = mock(async (input: any): Promise<any> => {
  if (typeof input === 'function') {
    return input(prisma);
  }

  if (Array.isArray(input)) {
    return Promise.all(input);
  }

  return input;
});

const prisma: any = {
  company: {
    findFirst: companyFindFirst,
    create: companyCreate,
    update: companyUpdate,
    count: companyCount,
  },
  request: {
    findMany: requestFindMany,
    update: requestUpdate,
    aggregate: requestAggregate,
  },
  person: {
    count: personCount,
  },
  scout: {
    count: scoutCount,
    findFirst: scoutFindFirst,
  },
  userSyncCursor: {
    findFirst: userSyncCursorFindFirst,
  },
  role: {
    findMany: roleFindMany,
    update: roleUpdate,
  },
  $transaction: transactionMock,
};

mock.module('@rolodex/db', () => ({
  prisma,
}));

import { ensureRoleCompaniesBackfilled } from '../src/services/rolodex/company';
import { getDashboardSummary } from '../src/services/rolodex/dashboard';

describe('rolodex dashboard services', () => {
  beforeEach(() => {
    companyFindFirst.mockReset();
    companyCreate.mockReset();
    companyUpdate.mockReset();
    requestFindMany.mockReset();
    requestUpdate.mockReset();
    requestAggregate.mockReset();
    personCount.mockReset();
    companyCount.mockReset();
    scoutCount.mockReset();
    userSyncCursorFindFirst.mockReset();
    scoutFindFirst.mockReset();
    roleFindMany.mockReset();
    roleUpdate.mockReset();
    (transactionMock as any).mockClear();
  });

  it('backfills missing role companies into first-class companies', async () => {
    roleFindMany.mockResolvedValue([
      {
        id: 'role-1',
        company: 'Northstar',
      },
    ]);
    companyFindFirst.mockResolvedValueOnce(null);
    companyCreate.mockResolvedValue({
      id: 'company-1',
      userId: 'user-1',
      name: 'Northstar',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      deletedAt: null,
    });

    await ensureRoleCompaniesBackfilled('user-1');

    expect(companyCreate).toHaveBeenCalledTimes(1);
    expect(roleUpdate).toHaveBeenCalledWith({
      where: { id: 'role-1' },
      data: {
        companyId: 'company-1',
        company: 'Northstar',
      },
    });
  });

  it('builds dashboard summary counts and last update from the latest successful sync', async () => {
    roleFindMany.mockResolvedValue([]);
    personCount.mockResolvedValue(12);
    companyCount.mockResolvedValue(5);
    scoutCount.mockResolvedValue(3);
    userSyncCursorFindFirst.mockResolvedValue({
      lastSuccessAt: new Date('2026-04-10T12:00:00.000Z'),
      updatedAt: new Date('2026-04-10T12:00:00.000Z'),
    });
    scoutFindFirst.mockResolvedValue({
      lastSuccessAt: new Date('2026-04-11T09:30:00.000Z'),
      updatedAt: new Date('2026-04-11T09:30:00.000Z'),
    });
    (requestFindMany as any).mockImplementation(
      async (args: { where?: { type?: 'ASK' | 'FAVOUR' } }) => {
        if (!args.where?.type) {
          return [];
        }

        if (args.where.type === 'ASK') {
          return [
            {
              id: 'ask-1',
              personId: 'person-1',
              parentId: null,
              type: 'ASK',
              description: 'Ask for referral intro',
              position: 0,
              completed: false,
              createdAt: new Date('2026-04-01T12:00:00.000Z'),
              updatedAt: new Date('2026-04-01T12:00:00.000Z'),
              person: { id: 'person-1', firstName: 'Avery', lastName: 'Patel' },
            },
          ];
        }

        return [
          {
            id: 'favour-1',
            personId: 'person-2',
            parentId: null,
            type: 'FAVOUR',
            description: 'Send intro notes',
            position: 0,
            completed: false,
            createdAt: new Date('2026-04-02T12:00:00.000Z'),
            updatedAt: new Date('2026-04-02T12:00:00.000Z'),
            person: { id: 'person-2', firstName: 'Mina', lastName: 'Cho' },
          },
        ];
      }
    );

    const summary = await getDashboardSummary('user-1');

    expect(summary.peopleCount).toBe(12);
    expect(summary.companiesCount).toBe(5);
    expect(summary.scoutsCount).toBe(3);
    expect(summary.lastUpdateAt).toBe('2026-04-11T09:30:00.000Z');
    expect(summary.requests.asks.length).toBe(1);
    expect(summary.requests.favours.length).toBe(1);
  });
});
