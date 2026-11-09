# Inventory U3 — Session Log

Append-only chronological record of development sessions. Do not replace old
entries with a new summary. Dates and results must be real; if a date was not
recorded, say so.

---

## Session 0 — Foundation extraction (date not recorded)

> Preserved from `docs/progress/LOG.md`, which was written before this session log
> existed. The exact date was not recorded.

### Objective

Create a generic inventory foundation from the previous dental codebase without
changing the source project.

### Work completed

- Copied the workspace to `/home/luis/proj/inventory-u3`.
- Removed the dental domain, database, API, app, i18n and E2E material.
- Replaced identifiers, package scope, branding and product copy.
- Reduced domain and validation to organization, user, session and shared
  primitives.
- Added minimal PostgreSQL and SQLite schemas plus generated migrations.
- Rewrote persistence, auth plugin, routes, seed data and integration tests.
- Replaced dashboard, inventory and settings screens with foundation pages.
- Reduced the translation catalogue to the current screens.
- Updated storage keys, unauthorized event name and Tauri identifier.
- Rewrote the browser suite around shell, auth, settings and language behaviour.
- Reduced documentation and ADRs to the inventory foundation.

### Files changed

The foundation extraction touched the monorepo, packages, database, API, app,
E2E and documentation. See commit `0808074` for the resulting tree.

### Technical decisions

- Retain the reusable infrastructure, remove the dental business domain
  (ADR 0038).
- Keep organization/user/session/role/permission as the product foundation.
- Keep SQLite as the default engine and PostgreSQL as the explicit second engine
  (ADR 0025).

### Tests and validation

Recorded by the foundation session:

- `pnpm install` — passed.
- `pnpm install --frozen-lockfile` — passed.
- `pnpm run db:migrate` — passed on SQLite.
- `pnpm run db:seed` — passed on SQLite.
- `pnpm run format:check` — passed.
- `pnpm run typecheck` — 12/12 tasks passed.
- `pnpm run lint` — 12/12 tasks passed, including the boundary guard.
- `pnpm run test` — 12/12 tasks passed, 127 tests.
- `pnpm run test:e2e` — 18/18 Playwright tests passed.
- `pnpm run build` — 5/5 build tasks passed.

### Problems found

- PostgreSQL integration tests skipped: no server available.
- Inventory product model still needed product decisions.
- Git history had not been initialized in the workspace.

### Pending work

- Establish the business domain and roadmap.
- Choose the first inventory business slice.

### Next session

Initialize version control and define the next development step.

---

## Session 1 — 2026-11-06 — Repository initialization

### Objective

Put the existing foundation under version control.

### Work completed

- Initialized a Git repository on branch `main`.
- Verified ignored artifacts were not staged: `node_modules`, `.env`, `data/`,
  `.turbo`, build output.
- Committed the foundation as `0808074` (`chore: initialize repository with Phase 1 foundation`),
  282 files and 27,014 insertions.

### Files changed

All committed foundation files. Working tree clean after the commit at that time.

### Technical decisions

- One initial commit for the foundation, rather than reconstructing history that
  was not recorded.
- The default branch is `main`.

### Tests and validation

No new test run in this session. The commit recorded the tree that the foundation
session had verified.

### Problems found

- None during the commit.

### Pending work

- Establish the business requirements, domain model and implementation roadmap.

### Next session

Document the business context and establish persistent progress tracking.

---

## Session 2 — 2026-11-09 — Documentation and progress baseline

### Objective

Establish a persistent documentation, roadmap and progress system for the
business implementation, based on the confirmed requirements and the actual state
of the repository.

### Work completed

- Inspected the repository structure, Git history, source code, schema,
  migrations, API routes, React features, tests and existing documentation.
- Confirmed the actual implemented scope: organization/user/session foundation,
  auth, organization settings, placeholder dashboard/inventory, dual-engine
  persistence.
- Created the project documentation set under `docs/project/`.
- Created the workflow specifications under `docs/workflows/`, explicitly marked
  NOT_IMPLEMENTED and separating confirmed rules from proposed design.
- Created the development tracking set under `docs/development/`, including a
  nine-milestone roadmap.
- Recorded the foundation extraction and repository initialization history in
  this log.
- Reconciled the old roadmap, state, log and question files with the new
  canonical documents.
- Added the mandatory future-session workflow to `AGENTS.md`.
- Updated the README documentation index.

### Files changed

Created:

- `docs/project/PROJECT_OVERVIEW.md`
- `docs/project/BUSINESS_REQUIREMENTS.md`
- `docs/project/BUSINESS_DOMAIN_MODEL.md`
- `docs/project/TECHNICAL_ARCHITECTURE.md`
- `docs/project/TECHNICAL_DECISIONS.md`
- `docs/workflows/INVENTORY_WORKFLOW.md`
- `docs/workflows/PURCHASE_WORKFLOW.md`
- `docs/workflows/PRODUCTION_WORKFLOW.md`
- `docs/workflows/SALES_CHECKPOINT_WORKFLOW.md`
- `docs/workflows/DAILY_CLOSING_WORKFLOW.md`
- `docs/workflows/PRODUCT_MEASUREMENT_RULES.md`
- `docs/development/IMPLEMENTATION_ROADMAP.md`
- `docs/development/IMPLEMENTATION_PROGRESS.md`
- `docs/development/CURRENT_TASK.md`
- `docs/development/KNOWN_ISSUES.md`
- `docs/development/SESSION_LOG.md`

Updated:

- `AGENTS.md` — future session protocol and documentation map.
- `README.md` — documentation index and onboarding pointer.
- `docs/roadmap.md` — superseded pointer to the canonical roadmap.
- `docs/domain.md` — pointer to the proposed business domain model.
- `docs/architecture.md` — pointer to the technical architecture summary.
- `docs/open-questions.md` — reconciled confirmed requirements with open
  questions.
- `docs/progress/STATE.md` — pointer to canonical progress/task documents.
- `docs/progress/LOG.md` — pointer to this canonical session log.
- `docs/decisions/README.md` — pointer to the new decision log.

The working tree also contains `scripts/start.sh` and a `package.json` `start`
script from earlier work; this documentation session did not change application
behaviour.

### Technical decisions

- Branch is the inventory boundary (TD-001).
- Sales are aggregate checkpoints, not individual transactions (TD-002).
- Estimated weight is derived and snapshotted (TD-003).
- Central operator only initially (TD-004).
- No WhatsApp API integration (TD-005).
- Documentation is the persistent source of truth (TD-007).
- The old generic roadmap is superseded (TD-008).

### Tests and validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`.
- `pnpm exec turbo run test --force` — PASS, 12/12 tasks, 127 tests.
- `pnpm run test:e2e` — NOT RUN.
- `pnpm run format:check` — PASS after formatting the documentation.
- Local Markdown link check — all local links resolve.
- `pnpm run build` — NOT RUN.

### Problems found

- No PostgreSQL server is available, so PostgreSQL integration tests cannot run
  here.
- The exact WhatsApp reporting format is still unconfirmed (BR-013).
- Unused dental-era dependencies remain in `packages/app`.
- No CI pipeline exists.
- The old documentation overlapped the new set; pointers were added to keep one
  canonical source.

### Pending work

- Implement M1-T1: branch domain entity, dual-engine persistence and tests.
- Confirm the business questions listed in `KNOWN_ISSUES.md`.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`,
`IMPLEMENTATION_PROGRESS.md`, `CURRENT_TASK.md` and the relevant business/
technical documents, then implement M1-T1. Update this log and the progress
documents before finishing.
