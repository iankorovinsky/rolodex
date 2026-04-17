import type { PrismaClient } from '../generated/client/client.js';

declare global {
  interface GlobalThis {
    prisma: PrismaClient | undefined;
  }
}

export {};
