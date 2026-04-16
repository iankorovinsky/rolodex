import { prisma } from '@rolodex/db';
import type { Prisma } from '@rolodex/db';
import type {
  Request,
  RequestFilters,
  CreateRequestRequest,
  ReorderRequestsRequest,
  UpdateRequestRequest,
} from '@rolodex/types';
import { ensurePersonOwnedByUser } from '../../utils/rolodex';
import { createAppError } from '../../utils/errors';

type DbClient = typeof prisma | Prisma.TransactionClient;

const requestInclude = {
  person: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.RequestInclude;

type RequestWithPerson = Prisma.RequestGetPayload<{
  include: typeof requestInclude;
}>;

const mapRequest = (request: RequestWithPerson): Request => ({
  ...request,
  person: request.person,
});

const requestOrderBy = [
  { position: 'asc' as const },
  { createdAt: 'asc' as const },
  { id: 'asc' as const },
];

async function getNextRequestPosition(
  client: DbClient,
  userId: string,
  type: CreateRequestRequest['type']
) {
  const result = await client.request.aggregate({
    where: {
      type,
      person: { userId },
    },
    _max: {
      position: true,
    },
  });

  return (result._max.position ?? -1) + 1;
}

export const ensureRequestPositions = async (userId: string) => {
  const requests = await prisma.request.findMany({
    where: {
      person: { userId },
    },
    select: {
      id: true,
      type: true,
      position: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const missingByType = new Map<string, Array<{ id: string }>>();
  for (const request of requests) {
    if (request.position !== null) {
      continue;
    }

    const current = missingByType.get(request.type) ?? [];
    current.push({ id: request.id });
    missingByType.set(request.type, current);
  }

  if (missingByType.size === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const [type] of missingByType) {
      const ordered = requests
        .filter((request) => request.type === type)
        .sort((left, right) => {
          if (left.position !== null && right.position !== null) {
            return left.position - right.position;
          }
          if (left.position !== null) {
            return -1;
          }
          if (right.position !== null) {
            return 1;
          }
          return left.createdAt.getTime() - right.createdAt.getTime();
        });

      let nextPosition = 0;
      for (const request of ordered) {
        await tx.request.update({
          where: { id: request.id },
          data: { position: nextPosition },
        });
        nextPosition += 1;
      }
    }
  });
};

export const listRequests = async (userId: string, filters: RequestFilters): Promise<Request[]> => {
  await ensureRequestPositions(userId);

  const requests = await prisma.request.findMany({
    where: {
      person: { userId },
      personId: filters.personId,
      type: filters.type,
      completed: filters.completed,
    },
    include: requestInclude,
    orderBy: requestOrderBy,
  });

  return requests.map(mapRequest);
};

export const createRequest = async (
  userId: string,
  data: CreateRequestRequest
): Promise<Request> => {
  await ensurePersonOwnedByUser(userId, data.personId);
  await ensureRequestPositions(userId);

  const position = await getNextRequestPosition(prisma, userId, data.type);

  const request = await prisma.request.create({
    data: {
      personId: data.personId,
      type: data.type,
      description: data.description,
      parentId: data.parentId,
      position,
    },
    include: requestInclude,
  });

  return mapRequest(request);
};

export const updateRequest = async (
  userId: string,
  id: string,
  data: UpdateRequestRequest
): Promise<Request | null> => {
  const existing = await prisma.request.findFirst({
    where: { id, person: { userId } },
  });

  if (!existing) {
    return null;
  }

  return prisma.request.update({
    where: { id },
    data: {
      description: data.description,
      completed: data.completed,
      parentId: data.parentId,
      position: data.position,
    },
    include: requestInclude,
  });
};

export const deleteRequest = async (userId: string, id: string): Promise<Request | null> => {
  const existing = await prisma.request.findFirst({
    where: { id, person: { userId } },
  });

  if (!existing) {
    return null;
  }

  return prisma.request.delete({ where: { id } });
};

export const reorderRequests = async (
  userId: string,
  data: ReorderRequestsRequest
): Promise<Request[]> => {
  if (data.ids.length === 0) {
    return [];
  }

  await ensureRequestPositions(userId);

  const selected = await prisma.request.findMany({
    where: {
      id: { in: data.ids },
      person: { userId },
    },
    include: requestInclude,
  });

  if (selected.length !== data.ids.length) {
    throw createAppError('One or more requests were not found.', 404);
  }

  const type = selected[0]?.type;
  if (!type || selected.some((request) => request.type !== type)) {
    throw createAppError('Requests must all be the same type.', 400);
  }

  const all = await prisma.request.findMany({
    where: {
      type,
      person: { userId },
    },
    include: requestInclude,
    orderBy: requestOrderBy,
  });

  const selectedIds = new Set(data.ids);
  const selectedById = new Map(selected.map((request) => [request.id, request]));
  const reordered = [
    ...data.ids.map((id) => selectedById.get(id)).filter(Boolean),
    ...all.filter((request) => !selectedIds.has(request.id)),
  ] as RequestWithPerson[];

  await prisma.$transaction(
    reordered.map((request, index) =>
      prisma.request.update({
        where: { id: request.id },
        data: { position: index },
      })
    )
  );

  return reordered.map((request, index) =>
    mapRequest({
      ...request,
      position: index,
    })
  );
};
