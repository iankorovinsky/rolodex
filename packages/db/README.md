# Database

## Usage

All database-related commands are run from the root:

- `bun run db:generate` - Generate Prisma client (run after schema changes)
- `bun run db:migrate` - Create/apply migrations
- `bun run db:studio` - Open Prisma Studio
- `bun run db:format` - Format Prisma schema

Prisma will use `DATABASE_URL` from your root `.env` file.

## Using Prisma Client

Import from `@rolodex/db` in both web and api:

```typescript
import { PrismaClient } from '@rolodex/db';

const prisma = new PrismaClient();
```
