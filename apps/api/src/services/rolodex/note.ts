import { prisma } from '@rolodex/db';
import type { CreatePersonNoteRequest, PersonNote, PersonNoteFilters } from '@rolodex/types';
import { ensurePersonOwnedByUser } from '../../utils/rolodex';

export const listNotes = async (
  userId: string,
  filters: PersonNoteFilters
): Promise<PersonNote[]> => {
  return prisma.personNote.findMany({
    where: {
      person: { userId },
      personId: filters.personId,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createNote = async (
  userId: string,
  data: CreatePersonNoteRequest
): Promise<PersonNote> => {
  await ensurePersonOwnedByUser(userId, data.personId);

  return prisma.personNote.create({
    data: {
      personId: data.personId,
      content: data.content,
    },
  });
};

export const deleteNote = async (userId: string, id: string): Promise<PersonNote | null> => {
  const existing = await prisma.personNote.findFirst({
    where: { id, person: { userId } },
  });

  if (!existing) {
    return null;
  }

  return prisma.personNote.delete({
    where: { id },
  });
};
