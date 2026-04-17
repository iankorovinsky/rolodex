# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding Guidelines

- **This is an MVP** — prioritize concise, simple solutions over complex abstractions.
- **Use shadcn/ui** for base components (`npx shadcn@latest add <component>`).
- **Build reusable components** when patterns repeat; place in `components/`.
- **Define types in `@rolodex/types`** — avoid defining types locally in apps.
- **No `any` or `unknown` or `as`** — use proper types; infer from Prisma when possible.
- **Data is per-user** — all queries should be scoped to the authenticated user.
- **Run `bun run ci` after changes** to verify typecheck, lint, format, build, and tests pass.

## Build & Development Commands

```bash
# Install dependencies
bun install

# Blessed dev TUI (desktop, API, Temporal, worker, storybook, db — see tools/scripts/dev-tui.js)
bun run dev

# Optional: Temporal + worker + desktop + API without the TUI
node ./tools/scripts/dev-with-temporal.mjs

# Temporal dev server only
node ./tools/scripts/start-temporal-dev.mjs

# Temporal worker only
bun run --filter @rolodex/jobs dev

# Build all packages/apps (Turbo)
bun run build

# Full local CI sequence
bun run ci

# Individual checks
bun run typecheck
bun run lint
bun run test
bun run format
bun run format:check
```

### Database Commands

Run against `@rolodex/db` (no `db:*` shortcuts on the root `package.json` today):

```bash
bun run --filter @rolodex/db generate       # Prisma client (after schema changes)
bun run --filter @rolodex/db migrate:dev    # Migrations (dev)
bun run --filter @rolodex/db studio         # Prisma Studio
bun run --filter @rolodex/db format         # prisma format
```

`turbo run generate --filter=@rolodex/db` is also valid for client generation.

### Database Migration Policy

- Edit `packages/db/prisma/schema/schema.prisma` first for any schema change.
- Create and apply migrations with `bun run --filter @rolodex/db migrate:dev`.
- Run `bun run --filter @rolodex/db generate` after a successful migration.
- Prefer the repo Bun commands over ad-hoc Prisma from the wrong cwd.
- Treat `packages/db/prisma/schema/migrations/*` as generated artifacts that should only change as a result of running migrations through the normal flow.
- Never manually create, rename, or edit files under `packages/db/prisma/schema/migrations/` unless explicitly asked for a manual SQL migration.
- Never use `prisma db push` as a substitute for migrations.
- If `migrate:dev` fails, stop and report the error. Do not hand-write `migration.sql` or manually patch migration files to work around it.

### Temporal (Local Development)

```bash
node ./tools/scripts/start-temporal-dev.mjs
```

The local dev server is pinned to gRPC port `7233` and Web UI port `8233`, with SQLite state stored at `infra/temporal/dev.db`.

### Running Single App/Package

```bash
bun run --filter '@rolodex/api' dev
bun run --filter '@rolodex/desktop' dev
bun run --filter '@rolodex/desktop' dist:mac
bun run --filter '@rolodex/api' test
bun run --filter '@rolodex/imessage-sync' run
```

### ESLint

- Shared logic: repo root `eslint.shared.mjs` (`createApiEslintConfig`, `createDesktopEslintConfig`).
- Entrypoints: `apps/api/eslint.config.mjs`, `apps/desktop/eslint.config.mjs` (relative import to `../../eslint.shared.mjs`).
- Related npm packages are `devDependencies` on the **root** `package.json`.

## Architecture

This is a Bun + Turbo monorepo:

- **apps/desktop**: Electron app with Vite, React 19, Tailwind CSS 4, and shadcn-style UI.
- **apps/api**: Express 5 on Bun.
- **packages/db**: Prisma 6 schema, client, migrations (PostgreSQL).
- **packages/types**: Shared TypeScript types (`@rolodex/types`).
- **packages/jobs**: Temporal worker and workflow code (`@rolodex/jobs`).
- **packages/imessage-sync**: Bun package for macOS Messages sync (`@rolodex/imessage-sync`).

### Package Dependencies

Workspace packages use the `workspace:*` protocol. Import shared types from `@rolodex/types` and the DB client from `@rolodex/db`.

### Authentication

Uses Supabase for desktop auth and API bearer tokens:

- Client: `@supabase/supabase-js` via `lib/supabase/client.ts`
- Auth context: `AuthProvider` in `lib/auth/auth-context.tsx`
- Backend verification: `apps/api/src/utils/auth.ts`

### Shared Types

Types are centralized in `packages/types`:

- `User` — re-exported from Prisma
- `AuthUser` — client-side auth user subset
- `ApiResponse<T>`, `ApiError` — standard API response wrappers
- `Integration`, `IntegrationType` — integration definitions

### API Structure

Express routes follow: `routes/*.ts` → `controllers/*.ts` → services / DB.

Error responses use `ApiResponse<null>` format from `@rolodex/types`.

## Environment Variables

Create `.env` at repo root. Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `DIRECT_URL` — Direct PostgreSQL connection (for Prisma migrations)
- `SUPABASE_URL` — Supabase project URL for backend token verification
- `SUPABASE_PUBLISHABLE_KEY` — Supabase publishable key for backend token verification
- `VITE_SUPABASE_URL` — Supabase project URL exposed to the Electron renderer
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable key exposed to the Electron renderer
- `API_URL` — Backend base URL shared by the Electron renderer and the macOS runner CLI
- `TEMPORAL_SERVER_URL` / `TEMPORAL_NAMESPACE` — Optional Temporal overrides for local development

Use `.env.example` as the source of truth for the current variable set.
