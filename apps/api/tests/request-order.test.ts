import { beforeEach, describe, expect, it, mock } from 'bun:test';

const requestFindMany = mock();
const requestUpdate = mock();
const requestAggregate = mock();

const transactionMock = mock(async (input: any): Promise<any> => {
  if (Array.isArray(input)) {
    return Promise.all(input);
  }

  if (typeof input === 'function') {
    return input(prisma);
  }

  return input;
});

const prisma: any = {
  request: {
    findMany: requestFindMany,
    update: requestUpdate,
    aggregate: requestAggregate,
  },
  $transaction: transactionMock,
};

mock.module('@rolodex/db', () => ({
  prisma,
}));

mock.module('../src/utils/rolodex', () => ({
  ensurePersonOwnedByUser: mock(async () => undefined),
}));

import { reorderRequests } from '../src/services/rolodex/request';

describe('request ordering', () => {
  beforeEach(() => {
    requestFindMany.mockReset();
    requestUpdate.mockReset();
    requestAggregate.mockReset();
    (transactionMock as any).mockClear();
  });

  it('reorders user requests and rewrites sequential positions', async () => {
    requestFindMany
      .mockResolvedValueOnce([
        {
          id: 'ask-1',
          type: 'ASK',
          position: 0,
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
        },
        {
          id: 'ask-2',
          type: 'ASK',
          position: 1,
          createdAt: new Date('2026-04-02T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'ask-1',
          personId: 'person-1',
          parentId: null,
          type: 'ASK',
          description: 'First',
          position: 0,
          completed: false,
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
          updatedAt: new Date('2026-04-01T00:00:00.000Z'),
          person: { id: 'person-1', firstName: 'Avery', lastName: 'Patel' },
        },
        {
          id: 'ask-2',
          personId: 'person-2',
          parentId: null,
          type: 'ASK',
          description: 'Second',
          position: 1,
          completed: false,
          createdAt: new Date('2026-04-02T00:00:00.000Z'),
          updatedAt: new Date('2026-04-02T00:00:00.000Z'),
          person: { id: 'person-2', firstName: 'Mina', lastName: 'Cho' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'ask-1',
          personId: 'person-1',
          parentId: null,
          type: 'ASK',
          description: 'First',
          position: 0,
          completed: false,
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
          updatedAt: new Date('2026-04-01T00:00:00.000Z'),
          person: { id: 'person-1', firstName: 'Avery', lastName: 'Patel' },
        },
        {
          id: 'ask-2',
          personId: 'person-2',
          parentId: null,
          type: 'ASK',
          description: 'Second',
          position: 1,
          completed: false,
          createdAt: new Date('2026-04-02T00:00:00.000Z'),
          updatedAt: new Date('2026-04-02T00:00:00.000Z'),
          person: { id: 'person-2', firstName: 'Mina', lastName: 'Cho' },
        },
      ]);

    (requestUpdate as any).mockImplementation(
      async ({ where, data }: { where: { id: string }; data: { position: number } }) => ({
        id: where.id,
        position: data.position,
      })
    );

    const reordered = await reorderRequests('user-1', { ids: ['ask-2', 'ask-1'] });

    expect(reordered.map((item) => item.id)).toEqual(['ask-2', 'ask-1']);
    expect(requestUpdate).toHaveBeenCalledTimes(2);
    expect((requestUpdate as any).mock.calls[0]?.[0]).toEqual({
      where: { id: 'ask-2' },
      data: { position: 0 },
    });
    expect((requestUpdate as any).mock.calls[1]?.[0]).toEqual({
      where: { id: 'ask-1' },
      data: { position: 1 },
    });
  });
});
