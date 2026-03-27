import { prisma } from '@rolodex/db';
import type {
  Request,
  RequestFilters,
  CreateRequestRequest,
  UpdateRequestRequest,
} from '@rolodex/types';
import { ensurePersonOwnedByUser } from '../../utils/rolodex';

export const listRequests = async (userId: string, filters: RequestFilters): Promise<Request[]> => {
  return prisma.request.findMany({
    where: {
      person: { userId },
      personId: filters.personId,
      type: filters.type,
      completed: filters.completed,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createRequest = async (
  userId: string,
  data: CreateRequestRequest
): Promise<Request> => {
  await ensurePersonOwnedByUser(userId, data.personId);

  return prisma.request.create({
    data: {
      personId: data.personId,
      type: data.type,
      description: data.description,
      parentId: data.parentId,
    },
  });
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
    },
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
