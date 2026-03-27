# @rolodex/api

Backend API server for Rolodex, part of the Rolodex monorepo.

## Tech Stack

- **Runtime**: Node.js (via Bun)
- **Framework**: Express 5
- **Language**: TypeScript 5.x
- **Database**: Prisma Client via `@rolodex/db` workspace package
- **Testing**: Jest
- **Linting**: ESLint

## Getting Started

### From Monorepo Root

```bash
# Install all dependencies (if not already done)
bun install

# Generate Prisma client (required before first run)
bun run db:generate

# Run API server (or use `bun run dev` to run web + api)
bun run --filter '@rolodex/api' dev
```

### From This Directory

```bash
# Install dependencies (if not already done)
bun install

# Run development server
bun dev
```

The API will be available at [http://localhost:8000](http://localhost:8000) (or the port specified in `PORT` env var).

## Commands

```bash
# Development
bun dev                    # Start API dev server with nodemon
bun run dev                # Same as above

# Build & Production
bun build                  # Build TypeScript to JavaScript
bun start                  # Start production server (requires build first)

# Testing
bun test                   # Run tests with Jest
bun test:watch             # Run tests in watch mode

# Code Quality
bun typecheck              # Typecheck without emitting files
bun lint                   # Run ESLint
```

### Running from Monorepo Root

```bash
# All commands can be run from root with filter
bun run --filter '@rolodex/api' dev          # Start API dev server
bun run --filter '@rolodex/api' build        # Build API
bun run --filter '@rolodex/api' start        # Start production server
bun run --filter '@rolodex/api' typecheck    # Typecheck API code
bun run --filter '@rolodex/api' lint         # Lint API code
bun run --filter '@rolodex/api' test         # Run API tests
bun run --filter '@rolodex/api' test:watch   # Run tests in watch mode
```

## Development

- **Entry point**: `src/server.ts`
- **App configuration**: `src/app.ts`
- **Database client**: Import from `@rolodex/db` workspace package
- **Environment variables**: Loaded from root `.env` file (see root README)
- **Port**: 8000 (default, configurable via `PORT` env var)
- **API routes**: `/api/items`

## Project Structure

```
src/
├── app.ts              # Express app configuration
├── server.ts           # Server entry point
├── config/             # Configuration
├── controllers/        # Route controllers
├── models/             # Data models
├── routes/             # API routes
├── middlewares/        # Express middlewares
└── index.ts            # Additional exports
```

## Workspace Dependencies

This app depends on:

- `@rolodex/db` - Prisma database client and schema
