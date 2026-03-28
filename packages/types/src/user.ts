/**
 * Re-export User type from Prisma
 * This is the canonical database user type
 */
export type { AvatarId, User } from '@rolodex/db';

export const AVATAR_IDS = [
  'CAT',
  'PANDA',
  'BUNNY',
  'BEAR',
  'GORILLA',
  'DUCK',
  'GIRAFFE',
  'PENGUIN',
  'SHARK',
  'DRAGON',
] as const;

export type AvatarIdValue = (typeof AVATAR_IDS)[number];

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarId: AvatarIdValue | null;
}

export interface UpdateUserProfileRequest {
  name: string;
  avatarId: AvatarIdValue;
}

/**
 * AuthUser is a subset of User for client-side auth contexts
 * Contains only the fields needed for UI/auth state
 */
export type AuthUser = UserProfile;
