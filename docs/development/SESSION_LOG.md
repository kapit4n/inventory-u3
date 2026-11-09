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
