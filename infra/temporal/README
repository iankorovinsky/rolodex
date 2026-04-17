Local Temporal (dev)

This repo runs Temporal in dev-mode with SQLite persistence at:

  infra/temporal/dev.db

### First-time start (creates `dev.db`)

From repo root:

  bun run dev

That launches the dev TUI (`tools/scripts/dev-tui.js`) which starts Temporal via:

  temporal server start-dev --db-filename infra/temporal/dev.db

If `infra/temporal/dev.db` doesn’t exist yet, Temporal will create it on first start.

*Note: If you are running multiple Temporal projects, this DB will be assigned to all of them. This repo setup assumes that you're only using the Temporal on this repo (and makes the DB so it can be used for Rolodex).

### Requirements

- You need the `temporal` CLI available on your PATH.
- The default ports are whatever you set in `.env`:
  - `TEMPORAL_SERVER_URL` (e.g. `localhost:7233`)
  - `TEMPORAL_UI_URL` (e.g. `http://localhost:8233`)