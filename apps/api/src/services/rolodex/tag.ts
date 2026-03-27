import { prisma } from '@rolodex/db';
import type { Tag, CreateTagRequest, UpdateTagRequest } from '@rolodex/types';
import { createAppError } from '../../utils/errors';

export const listTags = async (userId: string): Promise<Tag[]> => {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
};

export const createTag = async (userId: string, data: CreateTagRequest): Promise<Tag> => {
  const existing = await prisma.tag.findFirst({
    where: { userId, name: data.name },
  });

  if (existing) {
    throw createAppError('Tag name already exists.', 409);
  }

  return prisma.tag.create({
    data: {
      userId,
      name: data.name,
      color: data.color,
    },
  });
};

export const updateTag = async (
  userId: string,
  id: string,
  data: UpdateTagRequest
): Promise<Tag | null> => {
  const existing = await prisma.tag.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return null;
  }

  if (data.name && data.name !== existing.name) {
    const nameTaken = await prisma.tag.findFirst({
      where: { userId, name: data.name },
    });

    if (nameTaken) {
      throw createAppError('Tag name already exists.', 409);
    }
  }

  return prisma.tag.update({
    where: { id },
    data: {
      name: data.name,
      color: data.color,
    },
  });
};

export const deleteTag = async (userId: string, id: string): Promise<Tag | null> => {
  const existing = await prisma.tag.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return null;
  }

  return prisma.tag.delete({ where: { id } });
};
