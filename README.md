# Rolodex Monorepo

## Structure

```
rolodex/
├── apps/
│   ├── desktop/      # Electron desktop app
│   └── api/          # Backend API (Bun)
│
├── packages/
│   ├── db/           # Prisma schema & database client
│   └── types/        # Shared TypeScript types
│
├── tools/
│   └── scripts/      # Repo scripts
│
├── package.json       # Root workspace config
├── turbo.json         # Turborepo pipeline config
├── tsconfig.base.json # Base TypeScript config
└── .eslintignore      # Linter instructions
```

## Setup

```bash
# Copy env template and fill it in
cp .env.example .env

# Install all dependencies
bun install

# If Electron's binary download was skipped, repair it manually
bun run electron:install

# Generate Prisma client (must run after schema changes)
bun run db:generate

# Run migrations
bun run db:migrate
```

## Commands

### Root Commands

```bash
# Development
bun run dev                   # Start local Temporal + desktop + api
bun run dev:parallel          # Same as dev
bun run dev:custom            # Start the custom Blessed dashboard with Temporal, worker, desktop, api, and db
bun run temporal:dev          # Start only the local Temporal dev server
bun run temporal:worker       # Start only the local Temporal worker
bun run electron:install      # Reinstall the local Electron binary if desktop dev fails

# Build & Test
bun run build                 # Build all packages
bun run typecheck             # Typecheck all packages
bun run lint                  # Lint all packages
bun run test                  # Run tests in all packages
bun run format                # Format all files with prettier
bun run fmt                   # Alias for format
bun run format:check          # Check formatting without modifying files

# Database
bun run db:generate           # Generate Prisma client
bun run db:migrate            # Run database migrations (dev)
bun run db:studio             # Open Prisma Studio
bun run db:format             # Format Prisma schema
```

## CI Checks

CI runs on pull requests to `staging`. To run the same checks locally, you can use:

```bash
bun run ci
```

### API Commands (`apps/api`)

```bash
bun run --filter '@rolodex/api' dev          # Start API dev server
bun run --filter '@rolodex/api' build        # Build API
bun run --filter '@rolodex/api' start        # Start production server
bun run --filter '@rolodex/api' typecheck    # Typecheck API code
bun run --filter '@rolodex/api' lint         # Lint API code
bun run --filter '@rolodex/api' test         # Run API tests
bun run --filter '@rolodex/api' test:watch   # Run tests in watch mode
```

### Desktop Commands (`apps/desktop`)

```bash
bun run --filter '@rolodex/desktop' dev          # Start Electron + Vite dev loop
bun run --filter '@rolodex/desktop' build        # Build renderer and Electron main
bun run --filter '@rolodex/desktop' start        # Launch built Electron app
bun run --filter '@rolodex/desktop' typecheck    # Typecheck desktop code
bun run --filter '@rolodex/desktop' lint         # Lint desktop code
```

### Database Commands (`packages/db`)

```bash
bun run --filter '@rolodex/db' generate      # Generate Prisma client
bun run --filter '@rolodex/db' migrate:dev    # Run migrations (dev)
bun run --filter '@rolodex/db' migrate:deploy # Deploy migrations (prod)
bun run --filter '@rolodex/db' studio         # Open Prisma Studio
bun run --filter '@rolodex/db' format         # Format Prisma schema
```

## Workspace Packages

### Apps

- `@rolodex/desktop` - Electron desktop application
- `@rolodex/api` - Backend API server (Bun runtime)

### Packages

- `@rolodex/db` - Prisma schema and database client
- `@rolodex/types` - Shared TypeScript types

## Environment Variables

Copy [.env.example](/Users/iankorovinsky/Projects/rolodex/.env.example) to `.env` at the repo root and fill in the values.

Bun loads the root `.env` for the workspace. Use these names:

- `DATABASE_URL` and `DIRECT_URL` for Prisma/Postgres
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for backend token verification
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `API_URL` for the Electron renderer
- `ROLODEX_DEVICE_TOKEN` and `ROLODEX_MESSAGES_DB_PATH` only if you want default values for the macOS runner CLI
- `TEMPORAL_ADDRESS` only if you need to override the default local Temporal address

The Supabase URL and publishable key appear twice on purpose:

- plain `SUPABASE_*` for server-side code
- `VITE_*` for renderer-exposed Electron code

`API_URL` is shared by both the Electron renderer and the macOS runner CLI.

Local Temporal development uses:

- gRPC server on `localhost:7233`
- Web UI on `http://localhost:8233`
- SQLite persistence at `infra/temporal/dev.db`
- a local worker via `bun run temporal:worker`

## Adding New Packages

1. Create directory in `packages/` or `apps/`
2. Add `package.json` with unique name (e.g., `@rolodex/ui`)
3. Add to dependencies with `workspace:*` protocol
4. Run `bun install`
