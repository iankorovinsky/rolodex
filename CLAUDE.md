# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding Guidelines

- **This is an MVP** - prioritize concise, simple solutions over complex abstractions
- **Use shadcn/ui** for base components (`npx shadcn@latest add <component>`)
- **Build reusable components** when patterns repeat; place in `components/`
- **Define types in `@rolodex/types`** - avoid defining types locally in apps
- **No `any` or `unknown` or `as`** - use proper types; infer from Prisma when possible
- **Data is per-user** - all queries should be scoped to the authenticated user
- **Run `bun run ci` after changes** to verify typecheck, lint, format, build, and tests pass

## Build & Development Commands

```bash
# Install dependencies
bun install

# Development (starts desktop + api in Turbo's built-in TUI)
bun run dev

# Custom dev dashboard (Blessed UI in tools/scripts/dev-tui.js)
bun run dev:custom

# Build all packages
bun run build

# Run all CI checks (typecheck → lint → format:check → build → test)
bun run ci

# Individual checks
bun run typecheck
bun run lint
bun run test
bun run format
```

### Database Commands

```bash
bun run db:generate    # Generate Prisma client (run after schema changes)
bun run db:migrate     # Run migrations
bun run db:studio      # Open Prisma Studio
```

### Database Migration Policy

- Edit `packages/db/prisma/schema/schema.prisma` first for any schema change.
- Create and apply migrations by running `bun run db:migrate`.
- Run `bun run db:generate` after a successful migration.
- Prefer the repo Bun commands over direct Prisma commands for database work.
- Treat `packages/db/prisma/schema/migrations/*` as generated artifacts that should only change as a result of running `bun run db:migrate`.
- Never manually create, rename, or edit files under `packages/db/prisma/schema/migrations/` unless explicitly asked for a manual SQL migration.
- Never use `prisma db push` as a substitute for migrations.
- If `bun run db:migrate` fails, stop and report the error. Do not hand-write `migration.sql` or manually patch migration files to work around it.

### Trigger.dev (Background Jobs)

```bash
bunx trigger.dev login # First-time CLI login (opens browser)
bun run trigger:dev    # Start local dev server for tasks
bun run trigger:deploy # Deploy tasks to Trigger.dev cloud
```

Tasks are defined in `packages/jobs/src/`. Config is in `trigger.config.ts`.

Auto-deploys on push to `staging` via GitHub Actions (requires `TRIGGER_ACCESS_TOKEN` secret).

### Running Single App/Package

```bash
bun run --filter '@rolodex/api' dev       # API only
bun run --filter '@rolodex/desktop' dev   # Desktop only
bun run --filter '@rolodex/desktop' dist:mac  # Build macOS desktop artifacts
bun run --filter '@rolodex/api' test      # API tests only
```

## Architecture

This is a Bun/Turbo monorepo with the following structure:

- **apps/desktop**: Electron desktop app with Vite, React 19, Tailwind CSS 4, and shadcn/ui components
- **apps/api**: Express 5 backend API
- **packages/db**: Prisma 6 schema, client, and migrations (PostgreSQL)
- **packages/types**: Shared TypeScript types (`@rolodex/types`)
- **packages/jobs**: Trigger.dev background tasks (`@rolodex/jobs`)

### Package Dependencies

All workspace packages use the `workspace:*` protocol. Import shared types from `@rolodex/types` and database client from `@rolodex/db`.

### Authentication

Uses Supabase for desktop auth and API bearer tokens:

- Client: `@supabase/supabase-js` via `lib/supabase/client.ts`
- Auth context: `AuthProvider` in `lib/auth/auth-context.tsx`
- Backend verification: `apps/api/src/utils/auth.ts`

### Shared Types

Types are centralized in `packages/types`:

- `User` - re-exported from Prisma
- `AuthUser` - client-side auth user subset
- `ApiResponse<T>`, `ApiError` - standard API response wrappers
- `Integration`, `IntegrationType` - integration definitions

### API Structure

Express routes follow pattern: `routes/*.ts` → `controllers/*.ts` → `models/*.ts`

Error responses use `ApiResponse<null>` format from `@rolodex/types`.

## Environment Variables

Create `.env` at repo root. Required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection (for Prisma migrations)
- `SUPABASE_URL` - Supabase project URL for backend token verification
- `SUPABASE_PUBLISHABLE_KEY` - Supabase publishable key for backend token verification
- `VITE_SUPABASE_URL` - Supabase project URL exposed to the Electron renderer
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable key exposed to the Electron renderer
- `API_URL` - Backend base URL shared by the Electron renderer and the macOS runner CLI
- `ROLODEX_DEVICE_TOKEN` - Optional default device token for the macOS runner CLI
- `ROLODEX_MESSAGES_DB_PATH` - Optional override for the Messages `chat.db` path
- `TRIGGER_ACCESS_TOKEN` - Trigger.dev secret key (for triggering tasks from app code)

Use `.env.example` as the source of truth for the current variable set.

### GitHub Secrets (for CI/CD)

- `TRIGGER_ACCESS_TOKEN` - Trigger.dev Personal Access Token (for deploys)
