import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI (migrate, introspect, etc.) reads `datasource.url` here — there is no `directUrl` key in prisma.config (Prisma 7).
 * Prefer DIRECT_URL so migrations hit Postgres directly;
 * Runtime PrismaClient still uses DATABASE_URL in `src/client.ts` (pooled URL when using pgbouncer).
 */
function cliDatasourceUrl(): string {
  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error('Set DIRECT_URL for Prisma CLI');
  }
  return url;
}

export default defineConfig({
  schema: './models',
  migrations: {
    path: './migrations',
  },
  datasource: {
    url: cliDatasourceUrl(),
  },
});
