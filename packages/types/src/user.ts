/**
 * Re-export User type from Prisma
 * This is the canonical database user type
 */
export type { User } from '@rolodex/db';

/**
 * AuthUser is a subset of User for client-side auth contexts
 * Contains only the fields needed for UI/auth state
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}
