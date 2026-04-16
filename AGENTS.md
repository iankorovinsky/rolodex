# Repository Guidelines

## Project Structure & Module Organization

- `apps/desktop/`: Electron desktop app.
- `apps/api/`: Bun + Express API.
- `packages/db/`: Prisma schema and generated client.
- `packages/types/`: Shared TypeScript types; define most shared types here.
- `packages/jobs/`: Temporal workflows and worker code.
- `tools/scripts/`: Repo utilities (e.g., dev TUI).
- Root configs: `package.json`, `turbo.json`, `tsconfig.base.json`.

## Build, Test, and Development Commands

- `bun install`: install workspace dependencies.
- `bun run dev`: launch desktop + api development in Turbo's built-in TUI.
- `bun run dev:parallel`: same as `bun run dev`.
- `bun run dev:custom`: launch the custom Blessed dashboard from `tools/scripts/dev-tui.js`.
- `bun run build`: build all packages/apps.
- `bun run typecheck`: typecheck all packages.
- `bun run lint`: run ESLint across the repo.
- `bun run format`: apply Prettier formatting.
- `bun run format:check`: verify formatting only.
- `bun run test`: run tests (Jest in `apps/api`).
- `bun run ci`: local equivalent of CI checks; run after any change to confirm build and checks pass.
- Desktop packaging: `bun run --filter '@rolodex/desktop' dist:dir`, `dist:mac`, `dist:win`, `dist:linux`.
- Database: `bun run db:generate`, `bun run db:migrate`, `bun run db:studio`, `bun run db:format`.
- Temporal: `bun run temporal:dev`, `bun run temporal:worker`.

## Coding Style & Naming Conventions

- TypeScript is the primary language; follow existing patterns in each app.
- Formatting is enforced by Prettier; run `bun run format` before PRs.
- Linting uses ESLint in `apps/desktop` and TypeScript-focused rules in `apps/api`.
- Naming: `PascalCase` for React components, `camelCase` for variables/functions, `kebab-case` for file names when used in UI modules (follow nearby files).
- Use shadcn as the base for UI components and extend it as needed.
- Prioritize reusable components over one-off implementations.
- Avoid `any`, `unknown`, or vague types; prefer precise, shared types.

## Testing Guidelines

- API tests use Jest; place tests alongside code or in `__tests__/` as appropriate.
- Run all tests with `bun run test` before submitting.
- No explicit coverage threshold is configured; keep test scope proportional to changes.

## Commit & Pull Request Guidelines

- Recent history shows short, imperative summaries (e.g., “reorg”, “Updated README”). Keep commit messages concise and action-oriented.
- PRs should include: summary, key changes, and any required screenshots for UI work.
- Link related issues or notes if the change affects product behavior or data.

## Product & Architecture Notes

- The app is segmented per-user; ensure data access and UI behavior respect user boundaries.
- Prefer concise, MVP-focused solutions over overcomplicated designs.
- Temporal workflows and the worker live in `packages/jobs/src/`.

## Configuration Notes

- Root `.env` is loaded by Bun and shared by apps. Add app-specific overrides via `.env.local` if needed.
- Renderer-facing Supabase vars use the `VITE_` prefix.
- `API_URL` is shared by the Electron renderer and the macOS runner CLI.
- Server-side Supabase verification uses plain `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
- Runner CLI defaults use `ROLODEX_DEVICE_TOKEN` and `ROLODEX_MESSAGES_DB_PATH`.
- Use `.env.example` as the template for new environments.
- Local Temporal development uses `TEMPORAL_ADDRESS` and `TEMPORAL_NAMESPACE` when overrides are needed.

## Database Migration Policy

- For schema changes, edit `packages/db/prisma/schema/schema.prisma` first.
- Create and apply migrations by running `bun run db:migrate`.
- Run `bun run db:generate` after a successful migration.
- Prefer the repo Bun commands over direct Prisma commands for database work.
- Treat `packages/db/prisma/schema/migrations/*` as generated artifacts that should only change as a result of running `bun run db:migrate`.
- Never manually create, rename, or edit files under `packages/db/prisma/schema/migrations/` unless explicitly asked for a manual SQL migration.
- Never use `prisma db push` as a substitute for migrations.
- If `bun run db:migrate` fails, stop and report the error. Do not hand-write `migration.sql` or make manual migration edits to work around it.
