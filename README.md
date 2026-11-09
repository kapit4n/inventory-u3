# Inventory U3

A modern inventory management system for **Web** and **Desktop**.

> **Phase 1 — Business Foundation.**
> The technical foundation is complete: monorepo, tooling, auth/session,
> dual-engine database, shared React app, web/desktop shells and tests. The
> business domain is now being built milestone by milestone, starting with
> branches. No inventory operation is implemented yet. See
> [`docs/project/PROJECT_OVERVIEW.md`](./docs/project/PROJECT_OVERVIEW.md) and
> [`docs/development/IMPLEMENTATION_ROADMAP.md`](./docs/development/IMPLEMENTATION_ROADMAP.md).

## Principle

```
ONE REACT APPLICATION · ONE DOMAIN · TWO DEPLOYMENT TARGETS · TWO DATABASE ENGINES
```

Web and desktop ship the same React application; both talk to the same REST API.
SQLite is the default development engine, and PostgreSQL is the retained second
engine (ADR 0025). There is no offline synchronization.

## Repository map

```
apps/
  api/       Node + Fastify + TypeScript REST API (owns all DB access)
  web/       Browser deployment shell (Vite)
  desktop/   Tauri 2 deployment shell (Vite + src-tauri)
packages/
  app/       THE single React application (routes, providers, features, styles)
  ui/        Design system: tokens + shadcn/ui primitives
  domain/    Framework-independent inventory domain (pure TypeScript)
  api-client/ Typed REST client
  types/     Shared types/enums
  validation/ Zod schemas for every system boundary
  config/    Shared tooling config (tsconfig, eslint, prettier, vitest, tailwind)
  tsconfig/  Base TypeScript configs
database/
  schema/ migrations/ migrations-sqlite/ seed data
e2e/         Playwright specs
docs/        Project brief, requirements, domain, architecture, workflows,
             ADRs, canonical roadmap, progress, current task, session log
scripts/     check-boundaries.mjs (architecture guard), start.sh
```

## Getting started

```bash
# pnpm is required (v10). If missing: npm i -g pnpm --prefix "$HOME/.local"
export PATH="$HOME/.local/bin:$PATH"

pnpm install
cp .env.example .env

pnpm run db:migrate           # apply SQLite migrations by default
pnpm run db:seed              # development organization and users

pnpm run dev:web              # http://localhost:5173
pnpm run dev:api              # http://localhost:3010
pnpm run dev:desktop          # Tauri window
```

PostgreSQL remains available when a server and `DATABASE_URL` are configured.
Docker is not required for the default SQLite workflow.

## Commands

| Command                                                          | Purpose                                  |
| ---------------------------------------------------------------- | ---------------------------------------- |
| `pnpm build`                                                     | Build everything (Turbo)                 |
| `pnpm typecheck`                                                 | `tsc --noEmit` in every package          |
| `pnpm lint`                                                      | ESLint (includes the architecture guard) |
| `pnpm format` / `pnpm format:check`                              | Prettier                                 |
| `pnpm test`                                                      | Vitest unit + component tests            |
| `pnpm test:integration`                                          | Database integration tests               |
| `pnpm test:e2e`                                                  | Playwright (needs browsers + build)      |
| `pnpm guard:boundaries`                                          | Architectural dependency rules           |
| `pnpm db:up` / `db:down` / `db:migrate` / `db:seed` / `db:reset` | Database                                 |

## Documentation

Start here:

- [`docs/project/PROJECT_OVERVIEW.md`](./docs/project/PROJECT_OVERVIEW.md) — product, status, docs map
- [`docs/project/BUSINESS_REQUIREMENTS.md`](./docs/project/BUSINESS_REQUIREMENTS.md) — confirmed requirements and scope
- [`docs/project/BUSINESS_DOMAIN_MODEL.md`](./docs/project/BUSINESS_DOMAIN_MODEL.md) — implemented vs proposed domain
- [`docs/project/TECHNICAL_ARCHITECTURE.md`](./docs/project/TECHNICAL_ARCHITECTURE.md) — actual architecture and gaps
- [`docs/project/TECHNICAL_DECISIONS.md`](./docs/project/TECHNICAL_DECISIONS.md) — decision log
- [`docs/development/IMPLEMENTATION_ROADMAP.md`](./docs/development/IMPLEMENTATION_ROADMAP.md) — canonical M1–M9 roadmap
- [`docs/development/IMPLEMENTATION_PROGRESS.md`](./docs/development/IMPLEMENTATION_PROGRESS.md) — progress and verification
- [`docs/development/CURRENT_TASK.md`](./docs/development/CURRENT_TASK.md) — the task in progress
- [`docs/development/SESSION_LOG.md`](./docs/development/SESSION_LOG.md) — chronological session history
- [`docs/development/KNOWN_ISSUES.md`](./docs/development/KNOWN_ISSUES.md) — bugs, debt, risks, workarounds

Business workflows:

- [`docs/workflows/`](./docs/workflows) — measurement, inventory, purchase, production, sales checkpoint, daily closing

Detailed references:

- [`docs/architecture.md`](./docs/architecture.md) — system architecture and layers
- [`docs/domain.md`](./docs/domain.md) — currently implemented domain boundaries
- [`docs/frontend.md`](./docs/frontend.md) — React application architecture
- [`docs/backend.md`](./docs/backend.md) — REST API architecture
- [`docs/database.md`](./docs/database.md) — SQLite + PostgreSQL with Drizzle
- [`docs/desktop.md`](./docs/desktop.md) — Tauri 2 strategy
- [`docs/testing.md`](./docs/testing.md) — testing architecture
- [`docs/security.md`](./docs/security.md) — security baseline (**no compliance claims**)
- [`docs/open-questions.md`](./docs/open-questions.md) — questions needing product input
- [`docs/decisions/`](./docs/decisions) — architecture decision records
- [`AGENTS.md`](./AGENTS.md) — working agreement and session protocol

## Contribution rules (non-negotiable)

See `AGENTS.md`. The short version: no business logic or database access in
components; no Drizzle/React/Tauri/Postgres in the domain; server state lives in
TanStack Query and local state in Zustand; significant decisions get an ADR; the
architecture guard must pass.
