# Rolodex Monorepo

## Structure

```
rolodex/
├── apps/
│   ├── desktop/       # Electron + Vite + React
│   └── api/           # Bun + Express API
├── packages/
│   ├── db/            # Prisma schema, migrations, client
│   ├── types/         # Shared TypeScript (`@rolodex/types`)
│   ├── jobs/          # Temporal worker + workflows (`@rolodex/jobs`)
│   └── imessage-sync/ # macOS Messages sync CLI (`@rolodex/imessage-sync`)
├── infra/
│   └── temporal/      # Local Temporal SQLite dev state
├── tools/
│   └── scripts/       # Dev TUI, Temporal launcher, Electron install, etc.
├── eslint.shared.mjs  # Shared ESLint flat config (imported by apps)
├── package.json       # Workspace root (Turbo, Prettier, dev TUI deps)
├── turbo.json         # Turbo task pipeline
└── tsconfig.base.json # Shared TS baseline
```

Product and UI notes also live in **`DESIGN.md`** at the repo root.

## Setup

```bash
cp .env.example .env
bun install
```

Prisma client (after clone or schema change):

```bash
bun run --filter @rolodex/db generate
```

Migrations (dev):

```bash
bun run --filter @rolodex/db migrate:dev
```

## Commands

### Root (`package.json`)

These are the scripts defined on the **workspace root** today:

```bash
bun run dev              # Blessed dev TUI — desktop, API, Temporal, worker, Storybook, DB helpers
bun run build            # turbo run build
bun run typecheck        # turbo run typecheck
bun run lint             # turbo run lint
bun run test             # turbo run test
bun run ci               # typecheck → lint → format:check → build → test
bun run format           # Prettier write (includes .mjs)
bun run fmt              # alias → format
bun run format:check     # Prettier check only
```

### Database (`@rolodex/db`)

```bash
bun run --filter @rolodex/db generate
bun run --filter @rolodex/db migrate:dev
bun run --filter @rolodex/db migrate:deploy
bun run --filter @rolodex/db studio
bun run --filter @rolodex/db format
```

`turbo run generate --filter=@rolodex/db` works for Prisma generate via Turbo.

### API (`@rolodex/api`)

```bash
bun run --filter @rolodex/api dev
bun run --filter @rolodex/api build
bun run --filter @rolodex/api start
bun run --filter @rolodex/api typecheck
bun run --filter @rolodex/api lint
bun run --filter @rolodex/api test
bun run --filter @rolodex/api test:watch
```

### Desktop (`@rolodex/desktop`)

```bash
bun run --filter @rolodex/desktop dev
bun run --filter @rolodex/desktop build
bun run --filter @rolodex/desktop start
bun run --filter @rolodex/desktop typecheck
bun run --filter @rolodex/desktop lint
bun run --filter @rolodex/desktop storybook
bun run --filter @rolodex/desktop build-storybook
bun run --filter @rolodex/desktop dist:dir
bun run --filter @rolodex/desktop dist:mac
```

### Jobs (`@rolodex/jobs`)

```bash
bun run --filter @rolodex/jobs dev        # Temporal worker (tsx watch)
bun run --filter @rolodex/jobs typecheck
bun run --filter @rolodex/jobs test
```

### imessage-sync (`@rolodex/imessage-sync`)

```bash
bun run --filter @rolodex/imessage-sync run
```

## CI Checks

GitHub Actions workflows live under `.github/workflows/` (e.g. CI on pull requests to `staging`). Locally:

```bash
bun run ci
```

## Workspace Packages

| Name                     | Role                        |
| ------------------------ | --------------------------- |
| `@rolodex/desktop`       | Electron desktop app        |
| `@rolodex/api`           | HTTP API on Bun             |
| `@rolodex/db`            | Prisma + Postgres           |
| `@rolodex/types`         | Shared TS types             |
| `@rolodex/jobs`          | Temporal worker + workflows |
| `@rolodex/imessage-sync` | Messages DB sync CLI        |

## Environment Variables

Copy [`.env.example`](.env.example) to `.env` at the repo root.

Bun loads the root `.env` for workspace commands. Common names:

- `DATABASE_URL`, `DIRECT_URL` — Postgres / Prisma
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — API token verification
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `API_URL` — Electron renderer + API base URL
- `TEMPORAL_SERVER_URL`, `TEMPORAL_NAMESPACE`, `TEMPORAL_UI_URL` — Temporal overrides

Plain `SUPABASE_*` is for server-side code; `VITE_*` is for code bundled into the renderer.

Local Temporal defaults: gRPC `localhost:7233`, Web UI `http://localhost:8233`, SQLite under `infra/temporal/dev.db`.

## Adding New Packages

1. Create a directory under `packages/` or `apps/` with a `package.json`.
2. Use a scoped name (e.g. `@rolodex/ui`).
3. Reference it from other packages with `"@rolodex/ui": "workspace:*"`.
4. Run `bun install`.
