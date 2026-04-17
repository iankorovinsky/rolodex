# Repository Guidelines

## Project Structure & Module Organization

- `apps/desktop/`: Electron desktop app (Vite, React, Tailwind, shadcn-style UI).
- `apps/api/`: Bun + Express API.
- `packages/db/`: Prisma schema, migrations, and generated client.
- `packages/types/`: Shared TypeScript types (`@rolodex/types`); define most shared types here.
- `packages/jobs/`: Temporal worker, schedules, and workflows (`@rolodex/jobs`).
- `packages/imessage-sync/`: macOS Messages sync CLI package (`@rolodex/imessage-sync`).
- `infra/temporal/`: Local Temporal dev SQLite state (e.g. `dev.db`).
- Root `eslint.shared.mjs`: shared ESLint flat config composed by each app’s `eslint.config.mjs` (shared ESLint-related deps live on the root `package.json`).
- `tools/scripts/`: Repo utilities (Blessed dev TUI, etc.).
- Root configs: `package.json`, `turbo.json`, `tsconfig.base.json`, `eslint.shared.mjs`.

## Build, Test, and Development Commands

- `bun install`: install workspace dependencies.
- `bun run dev`: Blessed dev dashboard (`tools/scripts/dev-tui.js`) — spawns/manages desktop, API, Temporal, worker, Storybook, and DB-related dev processes from one TUI.
- `bun run build`: `turbo run build` for all packages/apps that define a `build` task.
- `bun run typecheck`: typecheck across the workspace (`turbo run typecheck`).
- `bun run lint`: ESLint via `turbo run lint` (API + desktop).
- `bun run format` / `bun run fmt`: Prettier write; `bun run format:check`: verify only.
- `bun run test`: `turbo run test` (e.g. Bun tests in `apps/api` and `packages/jobs` where defined).
- `bun run ci`: `typecheck` → `lint` → `format:check` → `build` → `test` at the repo root.
- Desktop packaging: `bun run --filter '@rolodex/desktop' dist:dir`, `dist:mac`, `dist:win`, `dist:linux`.
- **Database (no root shortcuts — use the db package):**  
  `bun run --filter @rolodex/db generate` · `migrate:dev` · `studio` · `format`  
  (or `turbo run generate --filter=@rolodex/db` for generate only).
- **Temporal worker:** `bun run --filter @rolodex/jobs dev`
- Temporal dev server + worker are started via `bun run dev` (the TUI) or package-specific `bun run --filter ...` commands.
- **imessage-sync CLI:** `bun run --filter @rolodex/imessage-sync run` (from package script).

## Coding Style & Naming Conventions

- TypeScript is the primary language; follow existing patterns in each app.
- Formatting is enforced by Prettier; run `bun run format` before PRs.
- Linting: shared rules in repo-root `eslint.shared.mjs` (Prettier disabled last); each app has `eslint.config.mjs` (API vs desktop + Storybook).
- Naming: `PascalCase` for React components, `camelCase` for variables/functions, `kebab-case` for file names when used in UI modules (follow nearby files).
- Use shadcn as the base for UI components and extend it as needed.
- Prioritize reusable components over one-off implementations.
- Avoid `any`, `unknown`, or vague types; prefer precise, shared types.

## Testing Guidelines

- API and jobs tests use **Bun’s test runner** (`bun test`); place tests alongside code or in `__tests__/` as appropriate.
- Run all tests with `bun run test` before submitting.
- No explicit coverage threshold is configured; keep test scope proportional to changes.

## Commit & Pull Request Guidelines

- Recent history shows short, imperative summaries (e.g., “reorg”, “Updated README”). Keep commit messages concise and action-oriented.
- PRs should include: summary, key changes, and any required screenshots for UI work.
- Link related issues or notes if the change affects product behavior or data.

## Product & Architecture Notes

- The app is segmented per-user; ensure data access and UI behavior respect user boundaries.
- Prefer concise, MVP-focused solutions over overcomplicated designs.
- Temporal workflows and worker code live in `packages/jobs/src/`.

## Configuration Notes

- Root `.env` is loaded by Bun and shared by apps. Add app-specific overrides via `.env.local` if needed.
- Renderer-facing Supabase vars use the `VITE_` prefix.
- `API_URL` is shared by the Electron renderer and the macOS runner CLI.
- Server-side Supabase verification uses plain `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
- Use `.env.example` as the template for new environments.
- Local Temporal development uses `TEMPORAL_SERVER_URL`, `TEMPORAL_NAMESPACE`, and optional `TEMPORAL_UI_URL` when overrides are needed.

## Database Migration Policy

- For schema changes, edit `packages/db/prisma/schema/schema.prisma` first.
- Create and apply migrations with `bun run --filter @rolodex/db migrate:dev` (or your hosting’s deploy migrate script).
- Run `bun run --filter @rolodex/db generate` after a successful migration.
- Prefer the repo Bun commands over raw Prisma CLI from random directories.
- Treat `packages/db/prisma/schema/migrations/*` as generated artifacts that should only change as a result of running migrations through the normal flow.
- Never manually create, rename, or edit files under `packages/db/prisma/schema/migrations/` unless explicitly asked for a manual SQL migration.
- Never use `prisma db push` as a substitute for migrations.
- If `migrate:dev` fails, stop and report the error. Do not hand-write `migration.sql` or make manual migration edits to work around it.
