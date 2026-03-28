import type { AvatarId, User } from '@rolodex/db';
import { prisma } from '@rolodex/db';

interface EnsureUserInput {
  id: string;
  email: string;
  name: string | null;
}

export const ensureUser = async ({ id, email, name }: EnsureUserInput): Promise<User> => {
  return prisma.user.upsert({
    where: { id },
    create: {
      id,
      email,
      name,
    },
    update: {
      email,
      name,
    },
  });
};

interface UpdateUserProfileInput {
  name: string;
  avatarId: AvatarId;
}

export const updateUserProfile = async (
  userId: string,
  { name, avatarId }: UpdateUserProfileInput
): Promise<User> => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name,
      avatarId,
    },
  });
};
