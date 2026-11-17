# AGENTS.md — Working Agreement for Inventory U3

> This file is the **durable memory** of this project. Read it FIRST, before any
> other file, every time you start working on Inventory U3 — including after a
> context reset, a new session, or a disconnect.
> Update this file and the documents in `docs/development/` at the end of every
> work session (see section 7).

---

## 1. What this product is

**INVENTORY U3** — a modern inventory management system.

- Target platforms: **Web** and **Desktop**
- It is a **NEW PRODUCT**. It is not a migration of anything.
- Stack: React 19 + TypeScript + Vite + Tailwind + shadcn/ui + TanStack (Router,
  Query, Table) + Zustand + RHF + Zod + Lucide, Tauri 2 for desktop, Node +
  TypeScript REST API, SQLite and PostgreSQL through Drizzle ORM, pnpm +
  Turborepo monorepo, Vitest + RTL + Playwright.
- Monorepo, ONE domain, TWO deployment targets, TWO database engines managed
  explicitly through the same repository ports.

## 2. Current phase

**PHASE 1 — BUSINESS FOUNDATION (in progress).**

The technical foundation is **complete** (monorepo, tooling, auth/session,
dual-engine database, shared React app, web/desktop shells, tests, boundary
guard). The current phase builds the business domain milestone by milestone. M1
and M2 are complete: branch, employee, supplier, category, measurement-unit,
product and presentation management, average-weight configuration and
effective-dated selling-price history. Product management lives on `/products`
and includes the presentation editor for processed products. M3 supplier
purchases and receiving is complete: multi-line draft purchases, one-shot
receiving into append-only stock movements, and audited full reversals. M4 branch
inventory is complete: balances derive from the exact integer-thousandth ledger,
adjustments, waste and reconciliation are audited, negative stock is refused, and
`/inventory` is implemented. M5 production is complete and committed as `7441653`.
M6 sales checkpoints are complete and committed as `52e39a3`; the final WhatsApp
reporting fields remain blocked on BR-013. M7 daily closing is complete and
committed as `e04bafa` (versioned snapshots, latest-purchase costing, audited
reopening). M8 dashboard and reporting is complete and committed as `9099246`
(on-demand consolidated reports, day/week/month periods, estimated profit, CSV
export); M9 hardening is next.

- Canonical roadmap: `docs/development/IMPLEMENTATION_ROADMAP.md`.
- Current task and status: `docs/development/CURRENT_TASK.md` and
  `docs/development/IMPLEMENTATION_PROGRESS.md`.
- Confirmed requirements: `docs/project/BUSINESS_REQUIREMENTS.md`.
- Proposed domain model: `docs/project/BUSINESS_DOMAIN_MODEL.md`.

**Do not jump ahead of the milestone.** A feature that belongs to M2–M9 must not
be implemented while an earlier milestone is incomplete, even if it looks
tempting. In particular, do not implement complete CRUD, stock, purchasing,
production, sales, closing or reporting before its milestone says so.

See `docs/roadmap.md` only as a superseded pointer. Do not add new work against
it.

## 3. The 25 non-negotiable architectural rules

1. No business logic in React components.
2. No database access in React components.
3. No direct PostgreSQL access from React.
4. No direct PostgreSQL access from Tauri.
5. No scattered Tauri API calls in React (use the platform abstraction).
6. No Drizzle imports in the domain.
7. No React imports in the domain.
8. No database-specific logic in the domain.
9. No giant Zustand store.
10. No global API-data store.
11. No circular dependencies between packages.
12. No giant generic utility directory.
13. No microservices.
14. No GraphQL.
15. No Redux.
16. Two engines, one set of ports: **SQLite runs everything by default**,
    PostgreSQL is retained as a second engine (ADR 0025). A schema change lands
    in `database/schema` _and_ `database/schema/sqlite`; a new repository method
    is written twice. Never a third database, and never an abstraction over the
    two.
17. No offline synchronization.
18. No premature abstractions.
19. Prefer explicit dependencies.
20. Prefer simple solutions.
21. Keep features independently understandable.
22. Keep business rules framework-independent.
23. Keep infrastructure replaceable.
24. Document significant decisions (ADR in `docs/decisions/`).
25. Naming must be domain-specific — never `data`, `stuff`, `helpers`, `misc`,
    `common2`, `manager`, `service2`. Prefer `ItemRepository`,
    `CreateStockMovement`, `SearchItems`, `GetItem`, `AdjustStockLevel`.

There is an automated guard for dependency direction, domain purity, database
access, thin shells and dual-engine schema/migration parity:
`pnpm run guard:boundaries` (see `scripts/check-boundaries.mjs`).

## 4. Repository map

```
apps/
  api/       Node.js + Fastify + TypeScript REST API (owns all DB access)
  web/       Browser deployment shell (Vite + index.html + main.tsx)
  desktop/   Tauri 2 deployment shell (Vite + src-tauri + main.tsx)
packages/
  app/       THE single React application (routes, providers, shell wiring)
  ui/        Design system: tokens + shadcn/ui primitives
  domain/    Framework-independent inventory domain (pure TypeScript)
  api-client/ Typed REST client used by web + desktop + app
  types/     Shared TS types/enums shared by all runtimes
  validation/ Zod schemas used at every system boundary
  config/    Shared tooling config (tsconfig, eslint, prettier, vitest, tailwind)
  tsconfig/  Base TS configs (extends into every package)
database/
  schema/    Drizzle schema (one file per bounded area, plus `schema/sqlite`)
  migrations/ Generated PostgreSQL SQL migrations + journal
  migrations-sqlite/ Generated SQLite SQL migrations + journal
  seeds/     Development seed data
e2e/         Playwright specs (web smoke + desktop strategy)
docs/        Project brief, requirements, domain, architecture, workflows,
             ADRs, canonical roadmap, progress, current task, session log
```

Dependency direction (inward only):

```
Presentation (apps/web, apps/desktop, packages/app, packages/ui)
    -> Application (application use cases + queries live with the feature)
        -> Domain (packages/domain)
Infrastructure (apps/api + Drizzle repositories, REST transport)
```

`packages/domain` MUST NOT import react, browser APIs, Tauri, SQLite,
PostgreSQL, Drizzle, TanStack Query, Zustand, or UI components.

## 5. Working style (mandatory)

1. Inspect -> 2. Understand -> 3. Identify constraints -> 4. Design ->
2. Document decisions -> 6. Implement the smallest necessary foundation ->
3. Verify (typecheck, lint, format, build, tests, boots) -> 8. Report.

- Never silently introduce a major architectural decision: write an ADR.
- When something is ambiguous: make the simplest reasonable assumption,
  document it, and mark it as **OPEN QUESTION** if product input is needed.
- Do not invent product requirements. Do not over-engineer.
- Priority order: maintainability > clear boundaries > DX > testability >
  consistent UI architecture > web/desktop reuse > future extensibility.

## 6. Commands (always use pnpm from the workspace root)

```bash
pnpm install
pnpm run build            # turbo build all
pnpm run typecheck        # tsc --noEmit everywhere
pnpm run lint             # eslint everywhere
pnpm run format           # prettier --write .
pnpm run format:check
pnpm run test             # vitest unit/component tests
pnpm run test:e2e         # playwright (needs browsers installed)
pnpm run guard:boundaries # dependency, domain-purity and engine-parity rules
pnpm run db:up | db:down  # start/stop local PostgreSQL (docker, optional)
pnpm run db:migrate       # apply drizzle migrations
pnpm run db:seed          # seed development data
pnpm run dev:web          # Vite dev server
pnpm run dev:api          # API dev server
pnpm run dev:desktop      # Tauri dev app
```

## 7. Session protocol (IMPORTANT — survives context loss)

At the **start** of a session:

1. Read this file.
2. Read `docs/project/PROJECT_OVERVIEW.md` (product, status, docs map).
3. Read `docs/development/IMPLEMENTATION_PROGRESS.md` (done/pending checklist)
   and `docs/development/CURRENT_TASK.md` (the only task you should be doing).
4. Read the requirements/domain/architecture/decisions documents relevant to the
   task, then the source files involved.
5. Read `docs/development/KNOWN_ISSUES.md` and `docs/open-questions.md` so you
   do not silently resolve an open question or repeat a known workaround.
6. `git status` and inspect the tree before changing anything.

**Continuity rule:** the documentation is the durable memory. If documentation
and code disagree, record the discrepancy in `KNOWN_ISSUES.md` and treat the code
as the current state until a decision says otherwise. Never invent history,
dates, test results or product requirements. If the task is unclear or an
unresolved question blocks it, stop and ask.

At the **end** of a session:

1. Update the checklist and verification record in
   `docs/development/IMPLEMENTATION_PROGRESS.md`.
2. Update `docs/development/CURRENT_TASK.md` (status, remaining steps, or the
   next task).
3. Append a dated entry to `docs/development/SESSION_LOG.md` with objective,
   work, files, decisions, verification, problems and next session.
4. Add or update `docs/development/KNOWN_ISSUES.md` and
   `docs/open-questions.md` for anything discovered or still unanswered.
5. Update `docs/development/IMPLEMENTATION_ROADMAP.md` if a milestone status
   changed.
6. Record significant decisions in `docs/project/TECHNICAL_DECISIONS.md` and, when
   architectural, add an ADR in `docs/decisions/`.
7. Run the verification commands for the work done and report the real results.
8. Report using the 13-section format in `docs/progress/REPORT_TEMPLATE.md`.

## 8. Environment notes for this machine

- Node v22.23.2, npm 10.9.8.
- **pnpm is NOT on the default PATH.** It was installed with
  `npm i -g pnpm@10 --prefix "$HOME/.local"`. Run
  `export PATH="$HOME/.local/bin:$PATH"` first (already added to `~/.bashrc`).
- **Docker is NOT available here any more** (no `docker`/`podman` binary, no
  `/var/run/docker.sock`), so local PostgreSQL cannot be started. The default
  engine is SQLite: `.env` sets `DATABASE_URL=sqlite:./data/inventory-u3.db`,
  and `pnpm run db:migrate` + `pnpm run db:seed` create the file and its
  directory (`/data/` is gitignored).
- `.env` also sets `TEST_DATABASE_URL` for PostgreSQL, so the default
  `pnpm run test:integration` tries to connect and fails with `ECONNREFUSED`
  when no server exists. Run `TEST_DATABASE_URL= pnpm run test:integration` to
  exercise the SQLite integration files; the PostgreSQL tests then skip
  themselves. See SI-06 in `docs/development/KNOWN_ISSUES.md`.
- Rust toolchain installed via rustup (stable 1.99.0, `~/.cargo`, `--no-modify-path`,
  PATH export appended to `~/.bashrc`). System Tauri deps installed via apt:
  `build-essential libwebkit2gtk-4.1-dev libgtk-3-dev libssl-dev
libayatana-appindicator3-dev librsvg2-dev`. `pnpm run dev:desktop` verified —
  first Rust compile takes ~3 minutes (422 crates, tauri 2.12.1). Desktop dev
  runs on `DISPLAY=:0`; keep the machine limitation note here if this changes.
- esbuild is added to `onlyBuiltDependencies` in `pnpm-workspace.yaml`; pnpm 10
  blocks its postinstall otherwise and Vite/Tauri frontend tooling breaks.
- Playwright's browsers live in `~/.cache/ms-playwright` and are **not** part of
  `pnpm install`. If every e2e spec fails with "Executable doesn't exist", run
  `pnpm exec playwright install chromium` from `e2e/`.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
