import { prisma } from '@rolodex/db';
import { createAppError } from './errors';

export const ensurePersonOwnedByUser = async (userId: string, personId: string) => {
  const person = await prisma.person.findFirst({
    where: { id: personId, userId, deletedAt: null },
    select: { id: true },
  });

  if (!person) {
    throw createAppError('Person not found.', 404);
  }
};
