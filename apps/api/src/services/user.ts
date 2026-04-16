import type { AvatarId, User } from '@rolodex/db';
import { prisma } from '@rolodex/db';

interface EnsureUserInput {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export const ensureUser = async ({
  id,
  email,
  firstName,
  lastName,
}: EnsureUserInput): Promise<User> => {
  return prisma.user.upsert({
    where: { id },
    create: {
      id,
      email,
      firstName,
      lastName,
    },
    // Do not sync names from Supabase on every request — profile is source of truth in DB.
    // JWT user_metadata can stay stale after the user updates their Rolodex profile.
    update: {
      email,
    },
  });
};

interface UpdateUserProfileInput {
  firstName: string;
  lastName: string | null;
  avatarId: AvatarId;
}

export const updateUserProfile = async (
  userId: string,
  { firstName, lastName, avatarId }: UpdateUserProfileInput
): Promise<User> => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      avatarId,
    },
  });
};
