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

---

## Session 3 — 2026-11-09 — M1-T1 branch foundation

### Objective

Commit the documentation baseline, then implement the first business entity:
`Branch`, with organization ownership, dual-engine persistence and tests.

### Work completed

- Committed the one-command start script as `742547d`.
- Committed the documentation and roadmap baseline as `23701fb`.
- Added the `BranchId` branded identifier.
- Added the `Branch` entity and `createBranch` validation in the domain.
- Added `BranchRepository` to the domain ports and `Repositories`.
- Added the PostgreSQL and SQLite `branches` tables and generated both
  migrations.
- Implemented PostgreSQL and SQLite branch repositories and wired them into both
  repository builders.
- Added domain tests and repository integration tests, including
  cross-organization isolation.
- Applied the SQLite migration and reseeded the development database.
- Updated the project, domain, architecture, progress, roadmap, issue and task
  documents.

### Files changed

Created:

- `packages/domain/src/branch/branch.ts`
- `packages/domain/src/branch/branch.test.ts`
- `packages/domain/src/branch/index.ts`
- `database/schema/branch.ts`
- `database/schema/sqlite/branch.ts`
- `database/migrations/0001_friendly_ken_ellis.sql`
- `database/migrations-sqlite/0001_large_fantastic_four.sql`
- `apps/api/src/infrastructure/persistence/repositories/branch-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/branch-repository.ts`
- `apps/api/test/branch-repository.integration.test.ts`

Updated:

- `packages/types/src/identifiers.ts` — `BranchId`.
- `packages/domain/src/index.ts`, `packages/domain/package.json`.
- `packages/domain/src/ports/index.ts`.
- `database/schema/index.ts`, `database/schema/sqlite/index.ts`.
- Both migration journals.
- `apps/api/src/infrastructure/persistence/sqlite/repositories.ts`.
- `apps/api/src/infrastructure/persistence/postgres/unit-of-work.ts`.
- `docs/domain.md`, `docs/open-questions.md`.
- `docs/project/BUSINESS_DOMAIN_MODEL.md`, `PROJECT_OVERVIEW.md`,
  `TECHNICAL_ARCHITECTURE.md`.
- `docs/development/IMPLEMENTATION_PROGRESS.md`,
  `IMPLEMENTATION_ROADMAP.md`, `CURRENT_TASK.md`, `KNOWN_ISSUES.md` and this log.
- `docs/decisions/0039-branch-scoped-persistence.md`, `README.md`.
- `docs/progress/STATE.md`, `docs/workflows/INVENTORY_WORKFLOW.md`, `AGENTS.md`.

### Technical decisions

- The branch entity is minimal: organization, name, active flag and timestamps.
- Branch names are unique within an organization.
- Reads always take both `organizationId` and `branchId`; a branch id is never
  trusted alone.
- Branch seed data is deferred until the real branch names are confirmed (BQ-19).
- No API route or UI was added in this slice.
- Branch-scoped persistence is recorded as ADR 0039.

### Tests and validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm exec turbo run test --force` — PASS, 12/12 tasks, 134 passed + 2 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api test:integration` — PASS,
  3 files, 18 passed + 2 skipped.
- `pnpm run db:migrate` — PASS on SQLite.
- `pnpm run db:seed` — PASS on SQLite.
- `pnpm run build` — PASS, 5/5 tasks.
- `pnpm run format:check` — PASS.
- Local Markdown link check — PASS.
- PostgreSQL branch repository tests — SKIPPED, no reachable server.
- Default `pnpm run test:integration` — FAILS with `ECONNREFUSED` because `.env`
  defines `TEST_DATABASE_URL`; use the empty override (SI-06).
- E2E — NOT RUN.

### Problems found

- The exact branch names are not confirmed, so the three development branches
  remain unseeded.
- No PostgreSQL server is available for the parity test on this machine.
- The default `test:integration` command fails because `.env` defines
  `TEST_DATABASE_URL`; it passes with the empty override (SI-06).
- Drizzle-generated `meta/*.json` files needed a Prettier pass after generation
  to keep `format:check` green.
- The branch is intentionally not reachable through the API or UI yet.

### Pending work

- Implement M1-T2: product, category, unit and presentation model.
- Confirm BQ-19 and the other product questions.
- Commit the M1-T1 working-tree changes when requested.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`,
`IMPLEMENTATION_PROGRESS.md`, `CURRENT_TASK.md`, the product requirements and
the branch slice, then implement M1-T2. Update this log and the progress
documents before finishing.

## Session 4 — 2026-11-09 — M1-T2 product catalog foundation

### Objective

Commit the M1-T1 branch slice, then implement the org-wide catalog identity:
measurement units, categories, products and presentations on both engines.

### Work completed

- Committed M1-T1 as `d6b62d5` — branch entity, dual-engine schema/migrations,
  repositories, tests, ADR 0039 and documentation.
- Added branded catalog identifiers and constructors for measurement units,
  categories, products and presentations.
- Added the four catalog entities and validation to `packages/domain` without
  React, Drizzle or database imports.
- Added catalog repository ports and extended `Repositories`.
- Added PostgreSQL and SQLite catalog tables, indexes, foreign keys and both
  migration journals.
- Implemented the eight PostgreSQL/SQLite catalog repositories and wired them
  into both repository builders.
- Added domain catalog tests and a dual-engine repository integration test with
  organization-isolation coverage.
- Applied the SQLite migration and reseeded the development database.
- Updated the progress, roadmap, task, issue, architecture, domain and overview
  documents.
- Committed M1-T2 as `10f882d`.

### Files changed

Created:

- `packages/domain/src/product/measurement-unit.ts`
- `packages/domain/src/product/product-category.ts`
- `packages/domain/src/product/product.ts`
- `packages/domain/src/product/product-presentation.ts`
- `packages/domain/src/product/index.ts`
- `packages/domain/src/product/product-catalog.test.ts`
- `database/schema/catalog.ts`
- `database/schema/sqlite/catalog.ts`
- `database/migrations/0002_tranquil_lady_vermin.sql`
- `database/migrations-sqlite/0002_massive_white_tiger.sql`
- `apps/api/src/infrastructure/persistence/repositories/measurement-unit-repository.ts`
- `apps/api/src/infrastructure/persistence/repositories/product-category-repository.ts`
- `apps/api/src/infrastructure/persistence/repositories/product-repository.ts`
- `apps/api/src/infrastructure/persistence/repositories/product-presentation-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/measurement-unit-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/product-category-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/product-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/product-presentation-repository.ts`
- `apps/api/test/product-catalog-repository.integration.test.ts`

Modified:

- `packages/types/src/identifiers.ts`.
- `packages/domain/src/ports/index.ts` and `packages/domain/src/index.ts`.
- `packages/domain/package.json`.
- `database/schema/index.ts` and `database/schema/sqlite/index.ts`.
- `apps/api/src/infrastructure/persistence/postgres/unit-of-work.ts`.
- `apps/api/src/infrastructure/persistence/sqlite/repositories.ts`.
- Generated migration metadata and journals on both engines.
- `docs/development/IMPLEMENTATION_PROGRESS.md`,
  `IMPLEMENTATION_ROADMAP.md`, `CURRENT_TASK.md`, `KNOWN_ISSUES.md` and this log.
- `docs/domain.md`, `docs/project/BUSINESS_DOMAIN_MODEL.md`,
  `PROJECT_OVERVIEW.md`, `TECHNICAL_ARCHITECTURE.md`,
  `TECHNICAL_DECISIONS.md`.
- `docs/workflows/PRODUCT_MEASUREMENT_RULES.md`, `docs/progress/STATE.md`.

### Technical decisions

- Catalog master data is organization-wide; stock will be branch-owned (TD-009).
- Units are explicit organization-owned rows referenced by id; no conversion
  factor is stored while BQ-10 is open.
- Products require inventory and sales units; purchase and production units are
  optional.
- Product names, category names, unit codes and presentation names are unique in
  their documented scope.
- Raw/processed kind, average weight and prices are deliberately absent; they
  belong to M1-T3/M2.
- No API route, UI or seed product data was added.

### Tests and validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm exec turbo run test --force` — PASS, 12/12 tasks, 147 passed + 3 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api test:integration` — PASS,
  4 files, 22 passed + 3 skipped.
- `pnpm run db:migrate` — PASS on SQLite, `0002` applied.
- `pnpm run db:seed` — PASS on SQLite.
- `pnpm run build` — PASS, 5/5 tasks.
- Generated Drizzle `meta/*.json` files were Prettier-formatted.
- PostgreSQL catalog repository tests — SKIPPED, no reachable server.
- Default `pnpm run test:integration` — FAILS with `ECONNREFUSED` because `.env`
  defines `TEST_DATABASE_URL`; use the empty override (SI-06).
- E2E — NOT RUN.

### Problems found

- No PostgreSQL server is available, so engine parity for the catalog repos is
  not verified on this machine.
- The default integration command still needs the empty `TEST_DATABASE_URL`
  override.
- Raw/processed, average weight and prices are still unimplemented by design.

### Pending work

- Implement M1-T3: raw/processed product kind and average-weight configuration.
- Confirm BQ-06, BQ-10 and BQ-19 before their dependent milestones.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`,
`IMPLEMENTATION_PROGRESS.md`, `CURRENT_TASK.md`, the product measurement rules
and the M1-T2 slice, then implement M1-T3. Update this log and the progress
documents before finishing.

## Session 5 — 2026-11-09 — M1-T3 raw/processed and average weight

### Objective

Make the raw/processed distinction explicit, add the configured average weight
per tray, and persist both on the two engines without implementing prices or
weight snapshots.

### Work completed

- Added the domain `PRODUCT_KINDS` list (`RAW`, `PROCESSED`) and `ProductKind`.
- Made `Product.kind` required and validated at creation.
- Added required positive `ProductPresentation.averageWeightGrams`.
- Added the PostgreSQL `product_kind` enum and the SQLite text + `CHECK` twin.
- Added `products.kind` and `product_presentations.average_weight_grams` to both
  schema trees and generated both migration journals.
- Updated all four catalog repositories to persist and read the new fields.
- Extended domain and repository tests for kind, weight, invalid values and
  round-trips.
- Applied the SQLite migration and reseeded the development database.
- Updated the progress, roadmap, task, issue, architecture, domain, model,
  measurement and open-question documents.

### Files changed

Created:

- `packages/domain/src/product/product-kind.ts`
- `database/migrations/0003_condemned_stick.sql`
- `database/migrations-sqlite/0003_vengeful_enchantress.sql`

Modified:

- `packages/domain/src/product/product.ts`
- `packages/domain/src/product/product-presentation.ts`
- `packages/domain/src/product/index.ts`
- `packages/domain/src/product/product-catalog.test.ts`
- `database/schema/enums.ts`
- `database/schema/catalog.ts`
- `database/schema/sqlite/catalog.ts`
- `apps/api/src/infrastructure/persistence/repositories/product-repository.ts`
- `apps/api/src/infrastructure/persistence/repositories/product-presentation-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/product-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/product-presentation-repository.ts`
- `apps/api/test/product-catalog-repository.integration.test.ts`
- Generated migration metadata and journals on both engines.
- `docs/development/IMPLEMENTATION_PROGRESS.md`,
  `IMPLEMENTATION_ROADMAP.md`, `CURRENT_TASK.md`, `KNOWN_ISSUES.md` and this log.
- `docs/domain.md`, `docs/open-questions.md`, `docs/progress/STATE.md`,
  `docs/project/BUSINESS_DOMAIN_MODEL.md`, `PROJECT_OVERVIEW.md`,
  `TECHNICAL_ARCHITECTURE.md`, `TECHNICAL_DECISIONS.md`.
- `docs/workflows/PRODUCT_MEASUREMENT_RULES.md`.

### Technical decisions

- `ProductKind` is required and shared by both database engines (TD-010).
- Average weight is stored as required positive integer grams; 0.001 kg is one
  gram, so this is exact and avoids floating-point drift (TD-010).
- The weight lives on the presentation; the product kind is not duplicated.
- Migrations add non-null columns without a hidden default. The tables were
  empty; a database with rows must be backfilled explicitly.
- Prices, estimated/measured weights and historical snapshots remain out of
  scope.
- No API route, UI or seed product data was added.

### Tests and validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm exec turbo run test --force` — PASS, 12/12 tasks, 149 passed + 3 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api test:integration` — PASS,
  4 files, 22 passed + 3 skipped.
- `pnpm run db:migrate` — PASS on SQLite, `0003` applied.
- `pnpm run db:seed` — PASS on SQLite.
- `pnpm run build` — PASS, 5/5 tasks.
- PostgreSQL catalog repository tests — SKIPPED, no reachable server.
- Default `pnpm run test:integration` — FAILS with `ECONNREFUSED` because `.env`
  defines `TEST_DATABASE_URL`; use the empty override (SI-06).
- E2E — NOT RUN.

### Problems found

- Drizzle's generated SQLite table-rebuild migration copied a `kind` column that
  did not exist on the old `products` table. The INSERT was corrected to omit
  `kind`: an empty table migrates, while a non-empty table fails loudly instead
  of inventing a RAW/PROCESSED default.
- No PostgreSQL server is available, so engine parity for the new kind and
  weight columns is not verified on this machine.
- M1-T3 was verified before being committed as `4168462`.

### Pending work

- Implement M1-T4: stock movement, balance and audit-safe correction concepts.
- Confirm BQ-03, BQ-06, BQ-07, BQ-08, BQ-10 and BQ-19 before their dependent
  milestones.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`,
`IMPLEMENTATION_PROGRESS.md`, `CURRENT_TASK.md`, the inventory workflow and the
M1-T3 slice, then implement M1-T4 as a domain-only stock vocabulary. Update this
log and the progress documents before finishing.

## Session 6 — 2026-11-09 — M1-T4 stock movement concepts

### Objective

Define the stock movement vocabulary and audit-safe correction invariants in the
domain, with a balance shape but no stock table, repository or UI.

### Work completed

- Added a branded `StockMovementId` and `asStockMovementId` shared by all
  runtimes.
- Added `STOCK_MOVEMENT_REASONS`: receiving, production input/output, sales
  checkpoint, adjustment, waste and correction.
- Added controlled source types and an optional `StockMovementSource` reference.
- Added `StockMovement` and `createStockMovement` with signed quantity, business
  and recording time, actor, note and correction reference.
- Enforced correction invariants: a correction must reference a different
  movement, and a non-correction must not carry a correction reference.
- Froze created movements and nested source references at runtime.
- Added `StockBalance` as an exported read-model interface only.
- Added 17 domain tests for creation, quantity, reason, source, correction and
  immutability.
- Added [ADR 0040](../decisions/0040-stock-movements-are-append-only.md) and
  linked it from the decision index.
- Updated the domain, model, inventory workflow, architecture, overview,
  progress, roadmap, task, issue and state documents.

### Files changed

Created:

- `packages/domain/src/stock/stock-movement-reason.ts`
- `packages/domain/src/stock/stock-movement-source.ts`
- `packages/domain/src/stock/stock-movement.ts`
- `packages/domain/src/stock/stock-balance.ts`
- `packages/domain/src/stock/index.ts`
- `packages/domain/src/stock/stock-movement.test.ts`
- `docs/decisions/0040-stock-movements-are-append-only.md`

Modified:

- `packages/types/src/identifiers.ts`
- `packages/domain/src/index.ts`
- `packages/domain/package.json`
- `docs/decisions/README.md`
- `docs/domain.md`
- `docs/open-questions.md`
- `docs/progress/STATE.md`
- `docs/project/BUSINESS_DOMAIN_MODEL.md`
- `docs/project/PROJECT_OVERVIEW.md`
- `docs/project/TECHNICAL_ARCHITECTURE.md`
- `docs/development/IMPLEMENTATION_PROGRESS.md`
- `docs/development/IMPLEMENTATION_ROADMAP.md`
- `docs/development/CURRENT_TASK.md`
- `docs/development/KNOWN_ISSUES.md` and this log.
- `docs/workflows/INVENTORY_WORKFLOW.md`

### Technical decisions

- A movement is append-only; a correction is another movement that references
  the original (ADR 0040).
- Quantity is a signed finite non-zero number in the product's inventory unit.
  No conversion is applied while BQ-10 is open.
- A correction must point at a different movement; no reversal arithmetic is
  implemented without the original row.
- Movement objects are frozen so runtime mutation is rejected too, not only by
  TypeScript's readonly types.
- `StockBalance` remains a type only because BQ-07 (derived versus cached) and
  BQ-08 (negative stock) are open.
- No stock table, repository port, migration, API route, seed or UI was added.

### Tests and validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm run guard:boundaries` — PASS, `BOUNDARY GUARD OK`.
- `pnpm exec turbo run test --force` — PASS, 12/12 tasks, 166 passed + 3 skipped.
- Domain suite — PASS, 45 tests including 17 stock tests.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api test:integration` — PASS,
  4 files, 22 passed + 3 skipped.
- `pnpm run build` — PASS, 5/5 tasks.
- PostgreSQL repository tests — SKIPPED, no reachable server.
- E2E — NOT RUN.
- No migration or seed was needed because no schema changed.

### Problems found

- None in the new code. The pre-existing PostgreSQL environment limitation and
  SI-06 remain.

### Pending work

- Commit the M1-T4 documentation.
- Implement M1-T5: document the access model for the central operator now and
  future branch users later, without building branch authorization or resolving
  BQ-09.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, `docs/security.md` and the role matrix, then write the M1-T5
access note. Update this log and the progress documents before finishing.

## Session 7 — 2026-11-09 — M1-T5 access model note

### Objective

Document the initial central-operator access boundary and the constraints for
future branch-scoped access without implementing branch authorization.

### Work completed

- Added [ACCESS_MODEL.md](../project/ACCESS_MODEL.md) with confirmed
  requirements, implemented roles/permissions, business actors, initial access,
  future branch scope, non-goals and open questions.
- Linked the access note from the security, architecture, domain-model and
  project-overview documents.
- Updated the roadmap, progress, current-task, known-issues, open-question and
  state documents.
- Kept BQ-09 open: no branch assignment, role, permission, route or UI changed.
- No code, schema, migration or seed changed.

### Files changed

Created:

- `docs/project/ACCESS_MODEL.md`

Modified:

- `docs/security.md`
- `docs/project/PROJECT_OVERVIEW.md`
- `docs/project/TECHNICAL_ARCHITECTURE.md`
- `docs/project/BUSINESS_DOMAIN_MODEL.md`
- `docs/development/IMPLEMENTATION_PROGRESS.md`
- `docs/development/IMPLEMENTATION_ROADMAP.md`
- `docs/development/CURRENT_TASK.md`
- `docs/development/KNOWN_ISSUES.md`
- `docs/open-questions.md`
- `docs/progress/STATE.md`
- This log.

### Technical decisions

- The initial version has one central operator with organization-wide operational
  access; branch employees do not log in.
- Existing `ADMINISTRATOR`/`MANAGER`/`STAFF` roles remain foundation roles.
  They are not renamed into business roles in this task.
- A future branch assignment must be resolved server-side. A client-supplied
  branch id is a selection, not authorization.
- The organization boundary remains mandatory; branch scope adds a restriction.
- Consolidated reports may cross branches only with permission and are
  owner-facing, not branch-user-facing.
- M1-T5 does not resolve BQ-09 or introduce `UserBranchAssignment`.

### Validation

- Documentation-only change; the M1-T4 code suite remains the last code run
  (typecheck 12/12, lint 12/12, tests 166 passed + 3 skipped, build 5/5 at
  `afc1cee`).
- `pnpm run format:check` — PASS after the documentation edits.
- Local Markdown link check — PASS after the documentation edits.
- No code test was added or required.

### Problems found

- None. The existing missing branch authorization is documented rather than
  implemented, as intended for this task.

### Pending work

- Commit the M1-T5 documentation.
- M1-T6: reconcile the technical docs, confirm the boundary guard covers the
  finished domain and close out M1.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, `TECHNICAL_ARCHITECTURE.md` and `docs/domain.md`, then perform
the M1-T6 documentation/boundary closeout.

## Session 8 — 2026-11-09 — M1-T6 docs and boundary guard closeout

### Objective

Reconcile the technical reference documents with M1 and extend the automated
boundary guard for the finished domain.

### Work completed

- Rewrote `docs/database.md` for the current eight tables, both schema trees,
  both migration journals, the seed state and the SQLite table-rebuild caveat.
- Updated `docs/backend.md`, `docs/testing.md` and `docs/architecture.md` for the
  branch/catalog repositories, integration coverage and guard scope.
- Extended `scripts/check-boundaries.mjs`:
  - shipped domain source may not import `node:`, `bun:` or `deno:` built-ins;
  - PostgreSQL and SQLite schema trees must declare the same table names;
  - both migration journals must have the same entry count.
- Verified the new rules with temporary failing probes:
  - a PostgreSQL-only table was rejected;
  - `import 'node:fs'` in domain source was rejected;
  - a SQLite journal with one entry removed was rejected.
- Updated the roadmap, progress, current task, known issues, state and M1 status.

### Files changed

Committed as `bfdc9cb`.

Created: none beyond the previous session's `docs/project/ACCESS_MODEL.md`.

Modified:

- `scripts/check-boundaries.mjs`
- `docs/database.md`
- `docs/backend.md`
- `docs/testing.md`
- `docs/architecture.md`
- `docs/domain.md`
- `docs/security.md`
- `docs/project/PROJECT_OVERVIEW.md`
- `docs/project/TECHNICAL_ARCHITECTURE.md`
- `docs/project/BUSINESS_DOMAIN_MODEL.md`
- `docs/development/IMPLEMENTATION_PROGRESS.md`
- `docs/development/IMPLEMENTATION_ROADMAP.md`
- `docs/development/CURRENT_TASK.md`
- `docs/development/KNOWN_ISSUES.md`
- `docs/open-questions.md`
- `docs/progress/STATE.md`
- This log.

### Technical decisions

- Schema parity at the guard level is table-name and journal-count parity, not a
  full column/index/migration-content comparison. Integration tests remain the
  authority for detailed parity (TD-09).
- Domain purity now includes a ban on Node/runtime built-ins in shipped source;
  test files may still use node tooling.
- M1 is complete. No new business behavior was added in M1-T6.
- The branch repository test is a cross-organization isolation test. Cross-branch
  tests begin with the first branch-owned operational tables (M3/M4); the M1
  acceptance wording was corrected to match the code.

### Validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm run guard:boundaries` — PASS, `BOUNDARY GUARD OK`.
- Guard negative probes — all three rejected as expected; probe files/journal
  restored.
- `pnpm exec turbo run test --force` — 12/12 tasks, 166 passed, 3 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api test:integration` — 4 files,
  22 passed, 3 skipped.
- `pnpm run build` — PASS, 5/5 tasks.
- `pnpm run format:check` — PASS.
- Local Markdown link check — PASS.
- Not run: Playwright E2E; PostgreSQL integration tests (no server).

### Problems found

- The guard cannot prove column-level schema parity or migration-content parity;
  recorded as TD-09 rather than claiming full parity.
- The M1-T5/M1-T6 changes were uncommitted during the session; they are committed
  as `bfdc9cb`.

### Pending work

- Start M2 with branch CRUD and the branch selector foundation.
- Seed the three branches only after BQ-19 is answered.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, `IMPLEMENTATION_ROADMAP.md`, `docs/project/ACCESS_MODEL.md`
and the M2 section of the roadmap before starting branch CRUD.

## Session 9 — 2026-11-09 — M2-T1 branch management and selector

### Objective

Deliver the first M2 master-data slice: branch list/create/edit end-to-end and a
reusable active-branch selector, without seeding branches or adding later-milestone
features.

### Work completed

- Added `BranchUpdate`, shared trimmed-name validation and `updateBranch` to the
  domain; update can rename and activate/deactivate while preserving identity,
  ownership and `createdAt`.
- Added `findByName` and `update` to `BranchRepository` and implemented both for
  SQLite and PostgreSQL with organization-scoped reads.
- Added branch validation schemas and inferred request/response types.
- Added authenticated `GET/POST/PUT /api/v1/branches` routes. Reads use
  `organization:read`; writes use `organization:manage`. Duplicate names return a
  domain conflict, missing branches return 404 and invalid bodies return 422.
- Added typed REST-client branch functions with response-schema validation.
- Added the Settings branch management section, create/edit dialog, query and
  mutation hooks, and a reusable selector that lists active branches by default.
- Added domain, REST-client, route, dual-engine repository and component tests.
- Updated domain, backend, access, technical-decision, testing, progress, roadmap,
  state, known-issues, current-task, overview and architecture documentation.
- Fixed the component test fetch mock typing that the full typecheck exposed
  (`Mock<typeof fetch>` plus `vi.fn<typeof fetch>`).

### Files changed

Committed after explicit authorization as `814f397`.

Domain and ports:

- `packages/domain/src/branch/branch.ts`, `branch.test.ts`
- `packages/domain/src/ports/index.ts`

Persistence:

- `apps/api/src/infrastructure/persistence/repositories/branch-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/branch-repository.ts`
- `apps/api/test/branch-repository.integration.test.ts`

Validation, API and client:

- `packages/validation/src/branch/index.ts`, `packages/validation/src/index.ts`,
  `packages/validation/package.json`
- `apps/api/src/http/routes/branches.ts`, `apps/api/src/app.ts`
- `apps/api/test/branches.integration.test.ts`
- `packages/api-client/src/branches.ts`, `branches.test.ts`, `index.ts`

Application UI and copy:

- `packages/app/src/features/branches/**`
- `packages/app/src/features/settings/components/settings-page.tsx`
- `packages/app/src/i18n/locales/en/branches.ts`, `es/branches.ts` and indexes

Documentation:

- `docs/domain.md`, `docs/backend.md`, `docs/testing.md`,
  `docs/project/ACCESS_MODEL.md`, `docs/project/TECHNICAL_DECISIONS.md` (TD-011),
  `docs/project/PROJECT_OVERVIEW.md`, `docs/project/TECHNICAL_ARCHITECTURE.md`,
  `docs/development/*` and `docs/progress/STATE.md`.

### Technical decisions

- Branch writes are administrator-only through `organization:manage`; reads use
  `organization:read` (TD-011). UI hiding is not authorization.
- Branches are deactivated, never hard-deleted, to preserve future operational
  references.
- Duplicate names are rejected with HTTP 409 `DOMAIN_RULE_VIOLATION`.
- Branch collection responses use `{ "items": [...] }`.
- The selector is a foundation component and currently unused by screens.
- Branch seeding is deferred because BQ-19 is unanswered.
- Branch-level authorization remains M9 / BQ-09 scope.

### Validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm run test` — PASS, 12/12 tasks, 183 passed, 4 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 5 files, 30 passed, 4 skipped.
- `pnpm run build` — PASS, 5/5 tasks; only Vite chunk-size warnings.
- `pnpm run format:check` — PASS.
- `pnpm run format` — applied.
- Not run: Playwright E2E; PostgreSQL integration cases (no server).

### Problems found

- The first full typecheck failed on the new component test's fetch mock cast;
  fixed with Vitest's `Mock<typeof fetch>` and `vi.fn<typeof fetch>`.
- The branch selector has no dedicated component test yet.
- Duplicate-name handling is application-checked before insert; the database
  unique constraint remains the final authority.
- M2-T1 was uncommitted during the session and later committed as `814f397`.

### Pending work

- Continue M2 with employee master data and branch assignment.
- Seed the three branches only after BQ-19 is answered.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, `IMPLEMENTATION_ROADMAP.md` and the M2 section of the roadmap
before starting the next master-data slice.

## Session 10 — 2026-11-09 — M2-T2 employee master data and branch assignment

### Objective

Add employee master data end to end so later production can identify the person
who prepared a product, without creating employee logins or seeding unconfirmed
names.

### Work completed

- Added `EmployeeId`, `Employee`, `NewEmployee`, `EmployeeUpdate`,
  `createEmployee`, `updateEmployee` and trimmed 1–160 character name validation.
- Added `EmployeeRepository` with organization-scoped `findById`,
  `listByOrganization`, `create` and `update`.
- Added `employees` to both schema trees with organization and branch foreign keys
  and an organization/branch/active index; generated `0004` migrations for both
  engines.
- Implemented SQLite and PostgreSQL employee repositories and wired them into the
  repository aggregate.
- Added employee validation schemas and inferred request/response types.
- Added authenticated `GET/POST/PUT /api/v1/employees` routes. Reads use
  `organization:read`; writes use `organization:manage`. Create and update require
  a branch in the caller's organization and return 422 otherwise.
- Added typed REST-client employee functions with response validation.
- Added Settings employee management with branch names, create/edit/deactivate
  dialog, branch selector, read-only state for non-administrators and English and
  Spanish copy.
- Added domain, REST-client, dual-engine repository, route and component tests.
- Applied SQLite migrations through `0004` and re-ran the seed.
- Updated domain, backend, database, testing, access, technical-decision,
  architecture, overview, roadmap, progress, state, known-issues and current-task
  documentation.
- Committed after explicit authorization as `6b50606`.

### Files changed

Domain, types and ports:

- `packages/domain/src/employee/employee.ts`, `employee.test.ts`, `index.ts`
- `packages/domain/src/index.ts`, `packages/domain/src/ports/index.ts`
- `packages/types/src/identifiers.ts`

Database:

- `database/schema/employee.ts`, `database/schema/sqlite/employee.ts`
- `database/schema/index.ts`, `database/schema/sqlite/index.ts`
- `database/migrations/0004_fat_sauron.sql` and journal
- `database/migrations-sqlite/0004_vengeful_roxanne_simpson.sql` and journal

API and client:

- `apps/api/src/infrastructure/persistence/repositories/employee-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/employee-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories.ts`,
  `apps/api/src/infrastructure/persistence/postgres/unit-of-work.ts`
- `apps/api/src/http/routes/employees.ts`, `apps/api/src/app.ts`
- `apps/api/test/employee-repository.integration.test.ts`,
  `apps/api/test/employees.integration.test.ts`
- `packages/validation/src/employee/index.ts`, validation indexes and package
  exports
- `packages/api-client/src/employees.ts`, `employees.test.ts`, `index.ts`

Application UI and copy:

- `packages/app/src/features/employees/**`
- `packages/app/src/features/settings/components/settings-page.tsx`
- `packages/app/src/i18n/locales/en/employees.ts`, `es/employees.ts` and indexes

Documentation:

- `docs/domain.md`, `docs/backend.md`, `docs/database.md`, `docs/testing.md`
- `docs/project/ACCESS_MODEL.md`, `TECHNICAL_DECISIONS.md` (TD-012),
  `PROJECT_OVERVIEW.md`, `TECHNICAL_ARCHITECTURE.md`
- `docs/open-questions.md` (BQ-20), `docs/development/*`,
  `docs/progress/STATE.md`, `docs/progress/REPORT.md`

### Technical decisions

- Employees are branch-owned for now because the proposed domain model places an
  employee in one branch; shared employees remain open (BQ-20, TD-012).
- Employee reads use `organization:read`; writes use `organization:manage`, the
  same administration boundary as branches (TD-011).
- Employees are deactivated, never deleted, to preserve future production
  references. Full names are not unique.
- No employee account, contact, payroll, attendance, identity-document or
  branch-transfer history is modeled.
- Create and update verify the branch belongs to the caller's organization; a
  client-supplied branch id is not proof of authorization.
- Employee collection responses use `{ "items": [...] }`.

### Validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm run test` — PASS, 12/12 tasks, 209 passed, 6 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 7 files, 42 passed, 6 skipped.
- `pnpm run build` — PASS, 5/5 tasks; only Vite chunk-size warnings.
- `pnpm run db:migrate` — PASS; SQLite migrations applied through `0004`.
- `pnpm run db:seed` — PASS; organization and development users only.
- `pnpm run format:check` — PASS.
- Typecheck, lint, unit/component/integration tests, build and the SQLite
  integration suite were re-run after the final Prettier pass; all passed.
- Not run: Playwright E2E; PostgreSQL integration cases (no server).

### Problems found

- The first full typecheck after adding the component test failed because the
  mock's indexed employee could be `undefined`; fixed with an explicit lookup and
  404 fallback.
- Radix Select interaction in jsdom required pointer-capture and scroll shims in
  the employee component test.
- The branch selector still has no dedicated component test, though the employee
  form exercises it.

### Pending work

- Continue M2 with supplier master data (M2-T3).
- Seed branches only after BQ-19; seed employees only when real names are available.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, `IMPLEMENTATION_ROADMAP.md` and the M2 section of the roadmap
before starting supplier master data.

## Session 11 — 2026-11-09 — M2-T3 supplier master data

### Objective

Close M2-T2 documentation and commit employee master data after explicit
authorization, then implement supplier master data end to end.

### Work completed

- Confirmed and committed M2-T2 as `6b50606`; recorded the commit in
  `7c8d23b docs: record M2-T2 commit`.
- Added `SupplierId`, `Supplier`, `NewSupplier`, `SupplierUpdate`,
  `createSupplier`, `updateSupplier` and trimmed 1–160 character name validation.
- Added `SupplierRepository` with organization-scoped `findById`,
  `listByOrganization`, `create` and `update`.
- Added `suppliers` to both schema trees with organization ownership, an active
  flag and an organization/active index; names are not unique and there is no
  branch column. Generated `0005` migrations for both engines.
- Implemented SQLite and PostgreSQL supplier repositories and wired them into
  the repository aggregates.
- Added supplier validation schemas and inferred request/response types.
- Added authenticated `GET/POST/PUT /api/v1/suppliers` routes. Reads use
  `organization:read`; writes use `organization:manage`.
- Added typed REST-client supplier functions with response validation.
- Added Settings supplier management with create/edit/deactivate dialog,
  read-only state for non-administrators and English and Spanish copy.
- Added domain, REST-client, dual-engine repository, route and component tests.
- Applied SQLite migrations through `0005` and re-ran the seed.
- Updated domain, backend, database, testing, access, technical-decision,
  architecture, overview, roadmap, progress, state, known-issues and
  current-task documentation.

### Files changed

Domain, types and ports:

- `packages/domain/src/supplier/supplier.ts`, `supplier.test.ts`, `index.ts`
- `packages/domain/src/index.ts`, `packages/domain/src/ports/index.ts`
- `packages/types/src/identifiers.ts`

Database:

- `database/schema/supplier.ts`, `database/schema/sqlite/supplier.ts`
- `database/schema/index.ts`, `database/schema/sqlite/index.ts`
- `database/migrations/0005_clear_moira_mactaggert.sql` and journal/snapshot
- `database/migrations-sqlite/0005_deep_chamber.sql` and journal/snapshot

API and client:

- `apps/api/src/infrastructure/persistence/repositories/supplier-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/supplier-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories.ts`,
  `apps/api/src/infrastructure/persistence/postgres/unit-of-work.ts`
- `apps/api/src/http/routes/suppliers.ts`, `apps/api/src/app.ts`
- `apps/api/test/supplier-repository.integration.test.ts`,
  `apps/api/test/suppliers.integration.test.ts`
- `packages/validation/src/supplier/index.ts`, validation indexes and package
  exports
- `packages/api-client/src/suppliers.ts`, `suppliers.test.ts`, `index.ts`

Application UI and copy:

- `packages/app/src/features/suppliers/**`
- `packages/app/src/features/settings/components/settings-page.tsx`
- `packages/app/src/i18n/locales/en/suppliers.ts`, `es/suppliers.ts` and indexes

Documentation:

- `docs/domain.md`, `docs/backend.md`, `docs/database.md`, `docs/testing.md`
- `docs/project/ACCESS_MODEL.md`, `TECHNICAL_DECISIONS.md` (TD-013),
  `PROJECT_OVERVIEW.md`, `TECHNICAL_ARCHITECTURE.md`
- `docs/open-questions.md` (BQ-21), `docs/development/*`,
  `docs/progress/STATE.md`, `docs/progress/REPORT.md`, `AGENTS.md`

### Technical decisions

- Suppliers are organization-wide because the same provider can deliver to
  several branches and each M3 purchase already carries its branch (TD-013).
- Supplier reads use `organization:read`; writes use `organization:manage`, the
  same administration boundary as branches and employees.
- Suppliers are deactivated, never deleted, so future purchases keep their
  supplier reference. Names are not unique; identity is the id.
- No contact, address, tax, payment-term, accounts-payable or account fields are
  modeled; the detail scope remains open (BQ-21).
- Supplier collection responses use `{ "items": [...] }`.
- No supplier seed was added because real supplier data is unavailable.

### Validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm run test` — PASS, 12/12 tasks, 234 passed, 8 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 9 files, 53 passed, 8 skipped.
- `pnpm run build` — PASS, 5/5 tasks; only Vite chunk-size warnings.
- `pnpm run db:migrate` — PASS; SQLite migrations applied through `0005`.
- `pnpm run db:seed` — PASS; organization and development users only.
- `pnpm run format:check` — PASS.
- Not run: Playwright E2E; PostgreSQL integration cases (no server).

### Problems found

- No supplier implementation or test failure required a workaround.
- The PostgreSQL supplier repository cases skip because no PostgreSQL server is
  available; this is the same environment limitation recorded as SI-06.

### Pending work

- Commit M2-T3 only after explicit authorization.
- Continue M2 with category, unit and presentation master data (M2-T4).
- Seed branches only after BQ-19; seed suppliers and employees only when real
  master data is available.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, `IMPLEMENTATION_ROADMAP.md` and the M2 section of the roadmap
before starting M2-T4.

## Session 12 — 2026-11-12 — M2-T4 category, unit and presentation master data

### Objective

Deliver category and measurement-unit management end to end and add presentation
domain, persistence, API and typed-client support, without implementing the
M2-T5 product screen.

### Work completed

- Added `updateMeasurementUnit`, `updateProductCategory` and
  `updateProductPresentation` domain behavior with shared trimmed-field
  validation. Presentation `productId` remains immutable.
- Extended both catalog repository ports with organization-scoped unique lookups
  and update methods; implemented them on SQLite and PostgreSQL.
- Added catalog validation schemas and inferred types for category, unit and
  nested presentation requests and responses.
- Added authenticated category and measurement-unit routes plus nested
  product-presentation routes with duplicate-key, not-found, ownership and
  validation handling.
- Added typed REST-client category, unit and presentation functions with
  response validation.
- Added category and measurement-unit management to Settings, including
  create/edit/deactivate dialogs, read-only behavior for non-administrators and
  English/Spanish copy.
- Deferred the presentation editor to the M2-T5 product screen because it
  requires a selected product (TD-014).
- Added domain, REST-client, dual-engine repository, route and component tests.
- Applied existing SQLite migrations through `0005` and re-ran the seed; no
  schema or migration changed.
- Updated domain, backend, database, testing, access, decision, architecture,
  overview, roadmap, progress, state, known-issues and current-task
  documentation.

### Files changed

Domain and validation:

- `packages/domain/src/product/measurement-unit.ts`,
  `product-category.ts`, `product-presentation.ts`, `product-catalog.test.ts`
- `packages/domain/src/ports/index.ts`
- `packages/validation/src/catalog/`, `packages/validation/src/index.ts`

Persistence, API and client:

- `apps/api/src/infrastructure/persistence/repositories/measurement-unit-repository.ts`,
  `product-category-repository.ts`, `product-presentation-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/measurement-unit-repository.ts`,
  `product-category-repository.ts`, `product-presentation-repository.ts`
- `apps/api/src/http/routes/product-categories.ts`, `measurement-units.ts`,
  `product-presentations.ts`, `apps/api/src/app.ts`
- `apps/api/test/catalog.integration.test.ts`,
  `apps/api/test/product-catalog-repository.integration.test.ts`
- `packages/api-client/src/catalog.ts`, `catalog.test.ts`, `index.ts`

Application UI and copy:

- `packages/app/src/features/product-categories/**`
- `packages/app/src/features/measurement-units/**`
- `packages/app/src/features/settings/components/settings-page.tsx`
- `packages/app/src/i18n/locales/en/product-categories.ts`,
  `measurement-units.ts` and locale index
- `packages/app/src/i18n/locales/es/product-categories.ts`,
  `measurement-units.ts` and locale index

Documentation:

- `docs/domain.md`, `docs/backend.md`, `docs/database.md`, `docs/testing.md`
- `docs/project/ACCESS_MODEL.md`, `TECHNICAL_ARCHITECTURE.md`,
  `PROJECT_OVERVIEW.md`, `TECHNICAL_DECISIONS.md` (TD-014)
- `docs/development/*`, `docs/progress/STATE.md`, `docs/progress/REPORT.md`,
  `AGENTS.md`

### Technical decisions

- Categories, units and presentations use the existing organization/product
  ownership and unique keys. Category names and unit codes are unique per
  organization; presentation names are unique per product (TD-014).
- Reads use `organization:read`; writes use `organization:manage`. All three are
  deactivated, never hard-deleted.
- Presentation routes verify that the product and presentation both belong to
  the caller's organization and that the presentation belongs to the path
  product.
- The presentation editor is deferred to the M2-T5 product screen rather than
  building a standalone product picker.
- No migration was needed because the catalog tables and unique constraints
  already existed. No catalog seed was added because real values are unconfirmed.

### Validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm run test` — PASS, 12/12 tasks, 261 passed, 9 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 10 files, 64 passed, 9 skipped.
- `pnpm run build` — PASS, 5/5 tasks; only Vite chunk-size warnings.
- `pnpm run db:migrate` — PASS; SQLite migrations applied through `0005`.
- `pnpm run db:seed` — PASS; organization and development users only.
- `pnpm run format:check` — PASS.
- Not run: Playwright E2E; PostgreSQL integration cases (no server).

### Problems found

- The first full unit run failed in `packages/api-client/src/catalog.test.ts`
  because an unused mock parameter used the name `url`; it was renamed to `_url`.
  After the fix, the full suite passed.
- The presentation PUT client mock initially returned the list envelope instead
  of a single presentation; it was corrected before the final run.
- The PostgreSQL repository cases skip because no PostgreSQL server is
  available; this is the same environment limitation recorded as SI-06.
- Concurrent catalog writes can still reach the database unique constraint after
  the application-level pre-check, extending the TD-10 risk to catalog rows.

### Pending work

- Commit M2-T4 only after explicit authorization.
- Continue M2 with product create/edit/list and the product-screen presentation
  editor (M2-T5).
- Seed branches only after BQ-19; seed employees, suppliers and catalog rows only
  when real master data is available.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, `IMPLEMENTATION_ROADMAP.md` and the M2-T5 scope before
starting product management.

## Session 13 — 2026-11-12 — M2-T5 product management and presentation editor

### Objective

Deliver product list/create/edit for raw and processed products end to end and
complete the M2-T4 deferred presentation editor inside the product screen. Do not
start M2-T6 prices or weight snapshots.

### Work completed

- Added `UpdateProduct` and `updateProduct` domain behavior with shared trimmed
  field validation; product identity, ownership and `createdAt` remain immutable.
- Added `ProductRepository.update` to the port and implemented it on SQLite and
  PostgreSQL, returning `undefined` when the product is missing from the caller's
  organization.
- Added product validation schemas and inferred request/response types, including
  the `RAW`/`PROCESSED` kind and optional purchase/production units.
- Added authenticated `GET/POST/PUT /api/v1/products` routes with
  `organization:read`/`organization:manage` permissions, organization-scoped
  category/unit reference validation and normal not-found problem mapping.
- Added typed REST-client product functions with response validation.
- Added the shared product feature: queries, create/update mutations, product
  management table, product form dialog, presentation dialog and presentation
  form dialog.
- Added the dedicated `/products` route in primary navigation with English and
  Spanish copy and read-only behavior for non-administrators.
- Exposed presentation create/edit/deactivate from the product screen for
  processed products while leaving the API product-scoped for every kind.
- Added domain, dual-engine repository, route, REST-client and component tests.
- Applied existing SQLite migrations through `0005` and re-ran the seed; no
  schema or migration changed.
- Corrected the committed M2-T4 documentation to record its commit as `992d6ea`.
- Updated domain, backend, database, testing, access, architecture, decision,
  overview, roadmap, progress, state, known-issues and current-task
  documentation.

### Files changed

Domain and persistence:

- `packages/domain/src/product/product.ts`, `product-catalog.test.ts`
- `packages/domain/src/ports/index.ts`
- `apps/api/src/infrastructure/persistence/repositories/product-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/product-repository.ts`

Validation, API and client:

- `packages/validation/src/catalog/index.ts`
- `apps/api/src/http/routes/products.ts`, `apps/api/src/app.ts`
- `apps/api/test/catalog.integration.test.ts`
- `apps/api/test/product-catalog-repository.integration.test.ts`
- `packages/api-client/src/products.ts`, `products.test.ts`, `index.ts`

Application UI and copy:

- `packages/app/src/features/products/**`
- `packages/app/src/routes/products.tsx`, `packages/app/src/routeTree.gen.ts`
- `packages/app/src/components/shell/sidebar.tsx`
- `packages/app/src/i18n/locales/en/products.ts`, `common.ts`, `index.ts`
- `packages/app/src/i18n/locales/es/products.ts`, `common.ts`, `index.ts`

Documentation:

- `docs/domain.md`, `docs/backend.md`, `docs/database.md`, `docs/testing.md`
- `docs/project/ACCESS_MODEL.md`, `TECHNICAL_ARCHITECTURE.md`,
  `PROJECT_OVERVIEW.md`, `TECHNICAL_DECISIONS.md` (TD-015)
- `docs/development/*`, `docs/progress/STATE.md`, `docs/progress/REPORT.md`,
  `AGENTS.md`

### Technical decisions

- Product names are not unique; identity is the product id. Product kind may be
  changed on update.
- Product create/update validate that category and all referenced units belong to
  the caller's organization. Inactive references remain selectable when editing a
  product that already uses them.
- Products use a dedicated `/products` primary-nav route rather than Settings
  because product management is an operational workflow with nested presentation
  management (TD-015).
- The product screen exposes the presentation editor only for processed products.
  The API does not enforce a kind restriction because the business has not
  confirmed one.
- No migration was needed because the product table already carried every needed
  column and ownership constraint. No product/catalog seed was added.

### Validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm run test` — PASS, 12/12 tasks, 274 passed, 9 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 10 files, 67 passed, 9 skipped.
- `pnpm run build` — PASS, 5/5 tasks; only Vite chunk-size warnings.
- `pnpm run db:migrate` — PASS; SQLite migrations applied through `0005`.
- `pnpm run db:seed` — PASS; organization and development users only.
- `pnpm run format:check` — PASS after formatting ten files.
- Not run: Playwright E2E; PostgreSQL integration cases (no server).

Current test counts: domain 6 files/70 tests, api-client 6/34, app 15/67, API
14 files/93 passed + 9 skipped, database 1/6, desktop 1/4.

### Problems found

- `pnpm run format:check` found ten unformatted new or edited files. They were
  formatted with Prettier before the final check.
- The initial product form used `form.watch`/`setValue` for unit fields, which
  triggered a React Hook Form lint warning. It was replaced with `Controller`
  before the final lint run.
- The final full typecheck found `kind` widened to `string` in the presentation
  dialog test fixture. Annotating the fixture as `ProductResponse` fixed it;
  typecheck, lint and the app suite then passed.
- The first presentation-dialog component test needed a nested-dialog interaction
  adjustment; both create and edit flows pass after the fix.
- The PostgreSQL repository cases skip because no PostgreSQL server is available;
  this is the same environment limitation recorded as SI-06.
- The M2-T4 commit hash was not recorded in the committed docs; it is now
  corrected to `992d6ea`.

### Pending work

- M2-T5 is committed as `c8526d0 feat: add product management and presentation
editor`.
- Continue M2 with average-weight and selling-price configuration with history
  (M2-T6).
- Seed branches only after BQ-19; seed employees, suppliers and catalog/product
  rows only when real master data is available.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, `IMPLEMENTATION_ROADMAP.md` and the M2-T6 scope before starting
price and average-weight history.

## Session 14 — 2026-11-12 — M2-T6 effective-dated selling-price history

### Objective

Add average-weight and selling-price history to M2. The existing presentation
average weight was already complete, so this session implemented the missing
selling-price history without creating a second weight model.

### Work completed

- Added `ProductPriceHistory`, the two basis values, the product-kind basis rule,
  calendar-date validation and append-only creation in the domain.
- Added `ProductPriceHistoryId`, a price-history repository port and
  `Repositories.productPriceHistory`.
- Added PostgreSQL and SQLite `product_price_history` tables with an enum/check,
  integer minor units, captured currency and basis, unique product/effective
  date and lookup indexes.
- Generated and applied migrations `0006_sudden_vapor.sql` and
  `0006_funny_peter_parker.sql`.
- Added both repositories and wired them into the PostgreSQL unit of work and
  SQLite repository container.
- Added price response/create validation and a list envelope carrying the
  organization's current currency.
- Added authenticated `GET/POST /api/v1/products/:productId/prices` routes.
- Added typed REST-client price functions.
- Added the `/products` price-history dialog, administrator new-price form,
  exact major-to-minor parsing, currency/basis/status display and bilingual copy.
- Kept price history readable by every authenticated role; only administrators
  can append. The actions column is now visible to non-administrators for this
  read-only action.
- Added domain, REST-client, SQLite/PostgreSQL repository, route, formatting and
  component tests.
- Updated the roadmap, progress, current task, technical decisions, open
  questions, state and report documents.

### Files changed

Domain, types and validation:

- `packages/domain/src/product/product-price-history.ts`
- `packages/domain/src/product/index.ts`, `product-catalog.test.ts`
- `packages/domain/src/ports/index.ts`
- `packages/types/src/identifiers.ts`
- `packages/validation/src/catalog/index.ts`

Database:

- `database/schema/catalog.ts`, `database/schema/sqlite/catalog.ts`
- `database/schema/enums.ts`
- `database/migrations/0006_sudden_vapor.sql`
- `database/migrations-sqlite/0006_funny_peter_parker.sql`

API and client:

- `apps/api/src/infrastructure/persistence/repositories/product-price-history-repository.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories/product-price-history-repository.ts`
- `apps/api/src/infrastructure/persistence/postgres/unit-of-work.ts`
- `apps/api/src/infrastructure/persistence/sqlite/repositories.ts`
- `apps/api/src/http/routes/product-price-history.ts`, `apps/api/src/app.ts`
- `apps/api/test/catalog.integration.test.ts`
- `apps/api/test/product-catalog-repository.integration.test.ts`
- `packages/api-client/src/product-prices.ts`, `index.ts`, `product-prices.test.ts`

Application UI and copy:

- `packages/app/src/features/products/price-format.ts`, `price-format.test.ts`
- `packages/app/src/features/products/components/product-price-dialog.tsx`
- `packages/app/src/features/products/components/product-price-form-dialog.tsx`
- `packages/app/src/features/products/components/product-management.tsx`
- `packages/app/src/features/products/components/product-management.test.tsx`
- `packages/app/src/features/products/queries/product-prices-query.ts`
- `packages/app/src/features/products/mutations/use-create-product-price.ts`
- `packages/app/src/i18n/locales/en/products.ts`
- `packages/app/src/i18n/locales/es/products.ts`

Documentation:

- `docs/project/TECHNICAL_DECISIONS.md` (TD-016)
- `docs/development/IMPLEMENTATION_ROADMAP.md`
- `docs/development/IMPLEMENTATION_PROGRESS.md`
- `docs/development/CURRENT_TASK.md`
- `docs/development/SESSION_LOG.md`
- `docs/progress/STATE.md`, `docs/progress/REPORT.md`
- `docs/open-questions.md`

### Technical decisions

- Prices are append-only and effective-dated. A change adds a row; history is
  never rewritten. Effective end is inferred from the next row (TD-016).
- Prices remain organization-wide until BQ-06 is answered. No branch column is
  added speculatively.
- The basis is derived from product kind at creation and captured with the row:
  `PROCESSED` => `PER_KILOGRAM`, `RAW` => `PER_SALES_UNIT`.
- Currency is captured from the organization at creation. The list response
  carries the current currency for the creation form.
- Amounts are integer minor units. The UI parses major-unit input without floats
  and formats through `Intl.NumberFormat`.
- No separate average-weight history table was added. Average weight remains
  presentation master data; operational records will snapshot weight in M5/M6.
- No update/delete route or correction audit exists yet; corrections are new
  effective-dated rows.

### Validation

- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks, `BOUNDARY GUARD OK`.
- `pnpm run test` — PASS, 12/12 tasks, 292 passed, 10 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 10 files, 69 passed, 10 skipped.
- `pnpm run build` — PASS, 5/5 tasks; only Vite chunk-size warnings.
- `pnpm run db:migrate` — PASS; SQLite migrations applied through `0006`.
- `pnpm run db:seed` — PASS; organization and development users only.
- `pnpm run format:check` — PASS after formatting.
- Not run: Playwright E2E; PostgreSQL integration cases (no server).

Current test counts: domain 6 files/74 tests, api-client 7/37, app 16/76, API
14 files/95 passed + 10 skipped, database 1/6, desktop 1/4.

### Problems found

- The first repository-test insertion placed the PostgreSQL case inside the
  SQLite describe block. Moving it into the `skipIf` PostgreSQL block and adding a
  category fixture fixed the typecheck.
- The first read-only UI test hid the action column for staff, even though price
  reads use `organization:read`. The actions column now shows the price action to
  every authenticated role while edit and presentation actions remain
  administrator-only. The final review found the price dialog still offered the
  New price button to staff; it is now hidden for non-administrators, and the
  read-only test asserts the dialog remains view-only.
- Opening `/products` crashed with `ROLE_PERMISSIONS[role]` undefined because a
  stale stored session had a `user` object without `role`. `readStoredSession`
  now re-validates the whole value against `loginResponseSchema`, and both
  password and development sign-in validate the response against the same
  schema. Invalid sessions are discarded instead of reaching `hasPermission`.
- Three regression tests cover a missing role, an unknown role and a malformed
  login response; the app suite is now 16 files/76 tests.
- PostgreSQL cases skip because no server is available; this is SI-06.
- The price form follows the existing `create.reset` reference pattern to avoid
  an unstable effect dependency.

### Pending work

- Review and commit M2-T6 when authorized. Current commit is not created.
- Continue M2-T7 remaining routes, validation, problem mapping, UI tests and
  browser coverage.
- Seed prices, branches, employees, suppliers and catalog rows only when real
  data is available (BQ-19 and related questions).

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, `IMPLEMENTATION_ROADMAP.md` and TD-016 before changing price
behavior. Confirm BQ-06 before introducing branch-scoped prices, and BQ-10 before
any unit conversion.

---

## Session 15 — 2026-11-13 — Sample fruit-and-vegetable development seed

### Objective

Populate the development database with illustrative initial data for a fruits
and vegetables store.

### Work completed

- Added a fixed-id sample catalogue to `database/development-data.ts`: 3
  branches, 4 employees, 3 suppliers, 6 measurement units, 4 categories, 21
  products (raw fruit, vegetables, herbs and processed trays), 6 tray
  presentations and 27 effective-dated price rows.
- Extended `database/seed.ts` on both engines to insert and restore the sample
  catalogue idempotently, in foreign-key order.
- Seeded the local SQLite database and verified the row counts; a second seed run
  left the counts unchanged.
- Updated the seed documentation, progress notes, known issues and BQ-19 wording
  to distinguish illustrative development data from confirmed real master data.

### Files changed

- `database/development-data.ts`
- `database/seed.ts`
- `docs/database.md`
- `docs/development/CURRENT_TASK.md`
- `docs/development/IMPLEMENTATION_PROGRESS.md`
- `docs/development/KNOWN_ISSUES.md`
- `docs/development/SESSION_LOG.md`
- `docs/open-questions.md`

### Technical decisions

- The sample catalogue is development data, not a product requirement. Real
  branch, product and price data still replace it when confirmed (BQ-19).
- Prices use the organization currency (`USD` in development), integer minor
  units and the kind-derived basis (`PER_SALES_UNIT` for raw products,
  `PER_KILOGRAM` for processed products).
- Every seeded row has a fixed UUID and is upserted by id, so the seed remains
  idempotent.

### Validation

- `pnpm --filter @inventory-u3/database run typecheck` — PASS.
- `pnpm --filter @inventory-u3/database run lint` — PASS.
- `pnpm run db:seed` — PASS on SQLite, twice; counts stayed stable at 3 branches,
  4 employees, 3 suppliers, 6 units, 4 categories, 21 products, 6 presentations
  and 27 price rows.
- `prettier --check database/seed.ts database/development-data.ts` — PASS.

### Problems found

- None. The existing schema already supported all seeded master data.

### Pending work

- Replace the illustrative catalogue with real master data when it is confirmed.
- Review and commit the M2-T6 changes and this seed addition when authorized.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md` and the open questions before changing seed data. Do not treat
the sample branch, product or price rows as confirmed business data.

## Session 16 — 2026-11-13 — M2-T7 master-data and product browser coverage

### Objective

Close M2 by adding the missing Playwright coverage for the master-data and
product screens, then record M2 as complete.

### Work completed

- Added `e2e/web/master-data.spec.ts`: lists every `/settings` card; creates and
  edits a branch; checks the duplicate-name branch problem message; creates an
  employee assigned to a branch; creates a supplier, category and unit; and
  verifies the read-only STAFF view.
- Added `e2e/web/products.spec.ts`: lists products; opens price history with
  current and scheduled rows; creates a raw product; edits a processed product;
  creates a tray presentation; appends an effective-dated price with the exact
  minor-unit payload; and verifies the read-only STAFF view with prices still
  visible.
- Added `e2e/web/fixtures/session.ts` so a spec can override the session role
  without duplicating the session shape.
- Updated `e2e/web/settings.spec.ts` and `e2e/web/i18n.spec.ts` to mock the
  master-data list queries now mounted on `/settings`, keeping the specs free of
  501 console errors.
- Updated the roadmap, progress, current-task and known-issues documents; M2 is
  now COMPLETED.

### Files changed

- `e2e/web/master-data.spec.ts` (new)
- `e2e/web/products.spec.ts` (new)
- `e2e/web/fixtures/session.ts` (new)
- `e2e/web/settings.spec.ts`
- `e2e/web/i18n.spec.ts`
- `docs/development/IMPLEMENTATION_ROADMAP.md`
- `docs/development/IMPLEMENTATION_PROGRESS.md`
- `docs/development/CURRENT_TASK.md`
- `docs/development/KNOWN_ISSUES.md`
- `docs/development/SESSION_LOG.md`

### Technical decisions

- Browser specs assert the requests the page sends via the mock API's
  `recorded` log; the mocked lists are static, so they do not assert that a
  newly-created row appears.
- The raw-to-finished relationship stays out of M2. BQ-11 resolves production
  inputs as free-form per batch, so there is no recipe/BOM entity to build; M5
  owns production inputs.
- No production code changed: the M2-T7 routes, validation, problem mapping and
  UI already existed from earlier tasks.

### Validation

- `pnpm --filter @inventory-u3/e2e run typecheck` — PASS.
- `pnpm --filter @inventory-u3/e2e run lint` — PASS.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`.
- `pnpm run test` — PASS, 12/12 tasks; 292 passed and 10 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 10 files, 69 passed and 10 skipped (PostgreSQL cases skip).
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warning only.
- `pnpm run test:e2e` — PASS, 29 Chromium tests.
- `pnpm run format:check` — PASS.
- The first browser run found a strict-mode duplicate text match and two
  `/settings` specs that now needed master-data mocks; both were fixed and the
  suite passed.

### Problems found

- `getByText('Central Market')` matched both the branch row and the employee
  branch cell. The specs now scope to the first cell.
- The expanded `/settings` page mounts five additional queries, so the older
  settings and i18n specs emitted 501 console errors until their fixtures were
  extended.

### Pending work

- Full workspace verification after the documentation edits passed, and M2-T6,
  the sample seed and M2-T7 were committed as `cc70bfc`.
- Start M3 supplier purchases and receiving.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, the M3 roadmap section and BQ-11 before starting M3. M2 is
complete; do not reopen master-data work unless a regression is found.

## Session 17 — 2026-11-13 — M3 supplier purchases and receiving

### Objective

Implement M3 end to end: register multi-line supplier purchases per branch,
receive them exactly once into stock, preserve purchase-price history, and allow
only audited corrections. Finish with browser coverage and honest verification.

### Work completed

- Added the purchase, purchase-item and purchase-correction domain model:
  branded ids, statuses, totals, integer-thousandth quantities, domain rules and
  `INVALID_STATE`.
- Added dual-engine tables and migrations: `purchases`, `purchase_items`,
  `purchase_corrections` and append-only `stock_movements` in `0007`;
  `PURCHASE_CORRECTION` in `0008` plus the unique correction key and the SQLite
  `stock_movements` check-constraint rebuild.
- Added PostgreSQL and SQLite purchase, correction and stock-movement
  repositories with branch/organization isolation.
- Added transactional receiving: a full, one-shot `DRAFT -> RECEIVED` transition
  with one `RECEIVING` movement per line.
- Added transactional correction: a required-reason full reversal with actor,
  before/after totals and one compensating `CORRECTION` movement per receipt
  movement.
- Added purchase validation schemas and types, authenticated routes with
  `inventory:read`/`inventory:write`, reference/unit validation, problem mapping
  and typed REST-client functions.
- Added the `/purchases` route, sidebar entry, list, multi-line form,
  receive/cancel actions, correction dialog and English/Spanish copy.
- Added domain, repository, route, REST-client, component and Playwright tests.
- Updated AGENTS.md and the project, workflow, database, backend, testing,
  roadmap, progress, current-task, known-issues, open-question and decision docs.

### Files changed

- `packages/domain/src/purchase/`, `packages/domain/src/stock/`,
  `packages/domain/src/shared/`, `packages/domain/src/ports/index.ts`
- `packages/types/src/identifiers.ts`, `packages/validation/src/purchase/`
- `database/schema/purchase.ts`, `database/schema/sqlite/purchase.ts`,
  `database/schema/enums.ts`, both schema/index trees
- `database/migrations/0007_*` and `0008_*`, `database/migrations-sqlite/0007_*`
  and `0008_*`, both journals and snapshot files
- `apps/api/src/application/purchase/`, `apps/api/src/http/routes/purchases.ts`,
  `apps/api/src/http/problem.ts`, `apps/api/src/app.ts` and both unit-of-work
  registries
- PostgreSQL and SQLite purchase/correction/stock-movement repositories
- `apps/api/test/purchase-receiving.integration.test.ts`,
  `apps/api/test/purchases.integration.test.ts`
- `packages/api-client/src/purchases.ts`, `purchases.test.ts`, `index.ts`
- `packages/app/src/features/purchases/`, `packages/app/src/routes/purchases.tsx`,
  sidebar, i18n and generated route tree
- `e2e/web/purchases.spec.ts`
- Documentation files listed above

### Technical decisions

- Receiving is all-or-nothing and exactly once; partial receiving is not assumed
  (BQ-15).
- Purchase quantities are integer thousandths; prices and totals are integer
  minor units with half-up rounding of the line total.
- A line unit must equal the product inventory unit until unit conversion is
  resolved (BQ-10).
- Received purchase items are the price history; no separate table was added.
- A correction is a full reversal (`afterTotalMinor = 0`) with a required reason
  and compensating movements; at most one correction per purchase. Recorded as
  TD-017.
- Stock movements are persisted from M3, but balance strategy and the inventory
  UI remain M4 work. BQ-07 and BQ-08 are still open.

### Validation

- `pnpm run format:check` — PASS after the final Prettier pass.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 335 passed and 12 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 12 files, 77 passed and 12 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 32 Chromium tests, including three purchase tests.
- `pnpm run db:migrate` — PASS, SQLite migrations applied through `0008`.
- The full check set above was re-run after `pnpm run format` reformatted the
  touched code and documentation; all results stayed green.
- The first purchase browser run failed on an ambiguous `$43.75` text match; the
  assertion was scoped to the correction explanation and the suite passed.
- The first SQLite integration run exposed an order-dependent assertion on two
  same-timestamp stock movements; the tests now sort signed quantities before
  comparing.
- PostgreSQL cases were skipped because no server is available (SI-06), not
  passed. The default integration command still needs `TEST_DATABASE_URL=` on
  this machine.

### Problems found

- Stock movements created in the same transaction share a timestamp, so source
  listings have no meaningful line order; tests must compare as a set or by a
  sorted key.
- `stock_movements.quantity_delta` is a floating number while purchase quantities
  are exact thousandths. Recorded as TD-11 for M4 to settle with the balance
  representation.

### Pending work

- M3 closeout committed as `13b8fcd feat: add supplier purchases, receiving and
audited corrections`; no M3 work remains pending.
- Start M4 branch inventory: decide derived versus cached balances (BQ-07),
  negative-stock policy (BQ-08), then implement balances, adjustments, waste and
  reconciliation on the persisted movement ledger.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, the M4 roadmap section and BQ-07/BQ-08 before changing stock
code. Do not start production, sales or closing work.

## Session 18 — 2026-11-15 — M4 branch inventory

### Objective

Implement M4 end to end on top of the M3 movement ledger: derived branch
balances, exact quantities, adjustments, waste, reconciliation, negative-stock
refusal, API/client/UI, dual-engine tests, browser coverage, migration validation
and continuity documentation.

### Work completed

- Accepted ADR 0041 / TD-018: balances derive from movements, quantities are
  exact integer thousandths, negative stock is always refused, and no balance
  cache table exists.
- Added `StockAdjustment` and `InventoryWaste` domain entities, factories and
  rules; added `assertStockDoesNotGoNegative` and `INSUFFICIENT_STOCK`.
- Migrated both engines from decimal movement quantities to
  `quantity_delta_milli`, added `stock_adjustments`, `inventory_waste` and the
  branch/product index, and generated migrations `0009` in both trees.
- Added PostgreSQL and SQLite movement timeline/balance queries, adjustment and
  waste repositories, and application use cases for adjustment, waste and
  reconciliation.
- Updated purchase receiving and correction for milli quantities and
  negative-balance checks.
- Added authenticated inventory read/write routes, validation schemas and typed
  REST-client functions.
- Replaced the `/inventory` placeholder with the branch stock table, movement
  history, adjustment/waste/count dialogs, empty states, permissions and
  bilingual copy.
- Added domain, route, dual-engine lifecycle, REST-client, component and
  Playwright inventory coverage.
- Fixed the time-dependent delivery-date assertion in the purchases component
  test by deriving today from the frozen clock helper.
- Updated the dashboard i18n and smoke browser tests for the real inventory page
  and supplied inventory fixtures so the Spanish spec never reaches the network.
- Updated AGENTS, project overview, roadmap, progress, current-task, session-log,
  report, workflow and decision documentation.

### Files changed

- `packages/types/src/identifiers.ts`, `packages/domain/src/shared/errors.ts`
- `packages/domain/src/stock/*`, `packages/domain/src/ports/index.ts`
- `database/schema/purchase.ts`, `inventory.ts`, `enums.ts`, both SQLite schema
  trees and both index exports
- `database/migrations/0009_*` and `database/migrations-sqlite/0009_*`, both
  journals and snapshots
- PostgreSQL and SQLite movement, adjustment and waste repositories; both
  repository registries
- `apps/api/src/application/inventory/`, `apps/api/src/application/purchase/`,
  `apps/api/src/http/routes/inventory.ts`, `apps/api/src/http/problem.ts`,
  `apps/api/src/app.ts`
- `packages/validation/src/inventory/`, `packages/api-client/src/inventory.ts`
- `packages/app/src/features/inventory/*`, i18n inventory catalogues
- `apps/api/test/inventory.integration.test.ts`,
  `apps/api/test/purchase-receiving.integration.test.ts`,
  `packages/api-client/src/inventory.test.ts`,
  `packages/app/src/features/inventory/components/inventory-page.test.tsx`,
  `e2e/web/inventory.spec.ts`
- `e2e/web/i18n.spec.ts`, `e2e/web/smoke.spec.ts` and the purchases component test
- Documentation files listed above

### Technical decisions

- Derived balances are the M4 source of truth; a cache can be introduced later
  only as a projection if reads require it.
- Stock quantities are exact integer thousandths, matching purchase quantities.
- Manual adjustments may be negative but not zero; waste is stored positive and
  posted negative; reconciliation may count zero.
- A reconciliation stores expected and counted quantities and writes a movement
  only for a non-zero difference.
- Opening stock is a positive manual adjustment.
- Negative stock has no override; any future override requires a separate audited
  decision and schema.
- HTTP maps domain stock refusals to `409 DOMAIN_RULE_VIOLATION`; quantity details
  remain in the error payload.

### Validation

- `pnpm run format:check` — PASS after the final Prettier pass.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 361 passed and 13 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 13 files, 82 passed and 13 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 36 Chromium tests, including four inventory specs.
- `pnpm run db:migrate` — PASS, SQLite migrations applied through `0009`.
- Migration `0009` was validated against the existing local database: 6
  `RECEIVING` movements total `118500`, 2 `CORRECTION` movements total `-45000`,
  net `73500`; both new tables and the new index exist.
- PostgreSQL cases were skipped because no server is available (SI-06), not
  passed.
- The first inventory component run exposed an immediate balance assertion while
  the balance query was still pending, and an error fixture missing the required
  `requestId`; both tests were corrected. The first full E2E run exposed the old
  placeholder smoke assertion and an i18n spec that reached the real network; the
  smoke expectation and inventory fixtures were updated. The full suites then
  passed.

### Problems found

- The component test initially read the balance before the query resolved; it now
  waits for the value.
- API error fixtures must include `requestId` or the client treats the response
  as a generic internal error.
- The smoke and i18n browser specs still assumed the M4 placeholder and needed
  real inventory fixtures; they now exercise the implemented screen.
- No PostgreSQL server is available, so the PostgreSQL half of the integration
  files remains skipped (SI-06).

### Pending work

- M4 was committed as `8f5f326 feat: add branch inventory with adjustments and
reconciliation`; no M4 work remains pending.
- Start M5 production: batches, preparer/operator, tray
  counts, average-weight snapshots, optional raw inputs, finished outputs and
  waste, all writing to the M4 ledger.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md`, the M5 roadmap section and BQ-11/BQ-12 before changing
production code. Do not start sales checkpoints or closing work.

## Session 19 — 2026-11-15 — M5 branch production

### Objective

Implement M5 end to end on top of the M4 ledger: branch production batches with
preparer/operator identity, tray counts, immutable weight snapshots, optional raw
inputs and measured weight, explicit waste, API/client/UI, dual-engine tests,
browser coverage and continuity documentation.

### Work completed

- Accepted ADR 0042 / TD-019: output lines snapshot the presentation, average
  weight per tray and estimated weight; confirmation posts one net ledger
  movement per product; a confirmed batch can be fully reversed once through an
  audited correction.
- Added `ProductionBatch`, `ProductionInput`, `ProductionOutput` and
  `ProductionWaste` domain types, statuses, weight bases and factories.
- Added `ProductionBatchRepository` with PostgreSQL and SQLite Drizzle
  implementations and registrations.
- Added production enums, tables, indexes and migrations `0010` on both engines.
- Added validation schemas, confirmation/correction use cases and six
  authenticated REST endpoints.
- Added typed API-client functions and tests, React Query hooks, `/production`
  with a branch filter, sidebar navigation, batch detail, create, confirm,
  correct and discard dialogs and English/Spanish copy.
- Added domain tests, a dual-engine production integration file, API-client
  tests, component tests and four Playwright specs.
- Fixed production form validation so blank default input/output rows do not
  block submission, while partial lines and a missing waste reason still fail.
- Fixed UI error mapping: the API client only exposes `DOMAIN_RULE_VIOLATION`
  for domain refusals, so stock and invalid-state messages are chosen from the
  error details.
- Updated ADR/TD, workflow, roadmap, progress, report, overview and state docs.

### Files changed

- `packages/domain/src/production/*`, `packages/domain/src/ports/index.ts`
- `packages/types/src/identifiers.ts`
- `database/schema/production.ts`, `database/schema/sqlite/production.ts`,
  enum/exports, migrations `0010` and both journals/snapshots
- `apps/api/src/infrastructure/persistence/{repositories,sqlite/repositories}/production-repository.ts`,
  both registries
- `apps/api/src/application/production/`, `apps/api/src/http/routes/production.ts`,
  `apps/api/src/app.ts`
- `packages/validation/src/production/`, `packages/api-client/src/production.ts`
  and its test
- `packages/app/src/features/production/*`, route tree, sidebar, i18n catalogues
- `apps/api/test/production.integration.test.ts`,
  `packages/app/src/features/production/components/production-page.test.tsx`,
  `e2e/web/production.spec.ts`
- `docs/decisions/0042-production-snapshots-drive-the-stock-ledger.md`,
  `docs/project/TECHNICAL_DECISIONS.md`, `docs/workflows/PRODUCTION_WORKFLOW.md`
  and the continuity documents listed above

### Technical decisions

- Output weight is `measuredWeightGrams ?? estimatedWeightGrams`; grams map 1:1
  to milli-kilograms.
- Confirmation aggregates net deltas per product, refuses negative stock, and
  writes one movement per affected product with source `PRODUCTION_BATCH`.
- Inputs require active `RAW` products; outputs require active `PROCESSED`
  products; waste may reference any active product.
- At least one line across inputs/outputs/waste is required. Input-only and
  waste-only batches are valid in the domain even though the normal workflow
  produces finished trays.
- Corrections are full reversals linked by `correctsMovementId`; one correction
  per batch. Draft discard is a hard delete.
- Production stores quantities and weights, not prices.

### Validation

- `pnpm run format:check` — PASS.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 385 passed and 13 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 14 files, 90 passed and 13 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 40 Chromium tests, including four production
  specs.
- PostgreSQL integration cases were skipped because no server is available
  (SI-06), not passed.

### Problems found

- The first production component assertion expected `2 trays · 1 kg`; the screen
  renders separate cells as `2 · 1.000 kg`, so the assertion was corrected.
- The first E2E correction assertion used the wrong copy; it now matches the
  dialog description exactly.
- A full parallel E2E run exposed a strict-mode collision on `getByText('Draft')`
  because the page also shows a draft-hint paragraph. Status assertions are now
  scoped to the batch row.
- The production form originally required non-empty zod strings on default blank
  rows, which silently blocked submission; the schema now validates only rows
  that contain data.
- `ApiClientError` does not expose `INVALID_STATE` or `INSUFFICIENT_STOCK`; UI
  code distinguishes them through `DOMAIN_RULE_VIOLATION` and error details.

### Pending work

- Commit M5 after explicit authorization.
- Run the PostgreSQL half of the integration suite on a machine with a server.
- Resolve BR-013 before starting M6 sales checkpoints.

### Next session

Read `AGENTS.md`, `PROJECT_OVERVIEW.md`, `IMPLEMENTATION_PROGRESS.md`,
`CURRENT_TASK.md` and the M6 roadmap section. Do not start M6 until BR-013 is
resolved.
