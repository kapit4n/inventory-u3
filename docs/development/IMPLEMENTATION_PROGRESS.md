# Inventory U3 — Implementation Progress

> This is the main progress document. Update it at the end of every session.
> Do not mark a task complete unless the repository and its tests prove it.

## Summary

| Field                  | Value                                                            |
| ---------------------- | ---------------------------------------------------------------- |
| Current milestone      | M3 — Supplier Purchases and Receiving (M2 complete)              |
| Current task           | M2-T7 complete in the working tree; commit pending authorization |
| Overall project status | M2 master data complete, including browser coverage              |
| Completed milestones   | M1 and M2; the foundation prerequisite is also complete          |
| In-progress milestones | None; M3 is the next milestone                                   |
| Blocked milestones     | M6 finalization is blocked on BR-013 (WhatsApp reporting format) |
| Pending milestones     | M3, M4, M5, M6, M7, M8, M9                                       |
| Last verified commit   | `c8526d0` (M2-T5); M2-T6, the seed and M2-T7 are uncommitted.    |
| Last update date       | 2026-11-13                                                       |
| Next recommended task  | Commit M2, then start M3 purchase and receiving work             |

### Working tree at the time of this update

M2-T6 adds an append-only, effective-dated `product_price_history` domain entity,
port, dual-engine tables and repositories, validation, authenticated price
routes, typed client functions, and a `/products` price-history dialog and form.
Rows capture integer minor units, organization currency, the product-kind-derived
basis and an ISO effective date. Changing a price appends a row; existing rows are
never edited or deleted. Prices are organization-wide for now (BQ-06) and the
basis is snapshotted so later product-kind edits cannot reinterpret history
(TD-016). Average weight remains presentation master data; historical weight
snapshots belong to M5/M6 operational records. M2-T4 is committed as `992d6ea`;
M2-T5 is committed as `c8526d0`; M2-T6, the sample seed and M2-T7 are
uncommitted.

M2-T7 adds Playwright browser coverage for the master-data cards on `/settings`
(branches, employees, suppliers, categories and units) and for `/products`
(products, tray presentations and effective-dated prices), including read-only
behavior for non-administrators. The existing settings spec now mocks the
master-data list queries so the expanded page stays console-error free.

## Verification for this update

M2-T6 changes the domain, both repository implementations, validation, API
routes, REST client, React UI, tests, database schema, migrations and
documentation.

| Command                                                                   | Result                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm run typecheck`                                                      | PASS — 12/12 tasks                                                        |
| `pnpm run lint`                                                           | PASS — 12/12 tasks, `BOUNDARY GUARD OK`                                   |
| `pnpm run guard:boundaries`                                               | PASS via lint — `BOUNDARY GUARD OK`                                       |
| `pnpm run test`                                                           | PASS — 12/12 tasks, 292 passed, 10 skipped                                |
| `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` | PASS — 10 files, 69 passed, 10 skipped                                    |
| `pnpm run build`                                                          | PASS — 5/5 tasks; Vite chunk-size warnings only                           |
| `pnpm run db:migrate`                                                     | PASS — SQLite migrations applied through `0006`                           |
| `pnpm run db:seed`                                                        | PASS — organization/users plus the sample fruit-and-vegetable catalogue   |
| `pnpm run format:check`                                                   | PASS — all files use Prettier style                                       |
| `pnpm run test:e2e`                                                       | PASS — 29 Chromium tests, including the new master-data and product specs |

Current test counts: domain 74, api-client 37, app 76, API 95 passed + 10 skipped,
database 6 and desktop 4 — 292 passed and 10 skipped in total, plus 29 browser
tests. The skipped tests are the PostgreSQL repository cases, which require a
reachable `TEST_DATABASE_URL`. Typecheck, lint, tests, build and SQLite
integration were run after the final code changes; only documentation was edited
afterwards, then Prettier and the final checks were re-run.

PostgreSQL integration tests were not executed because no PostgreSQL server is
available on this machine. This is a known environment limitation, not a pass.
The default `pnpm run test:integration` fails here because `.env` supplies a
`TEST_DATABASE_URL` pointing at the absent server; run it as
`TEST_DATABASE_URL= pnpm run test:integration` to exercise the SQLite
integration files without the PostgreSQL half. See SI-06.

---

## M1 — Business Domain Foundation

**Status: COMPLETED**

### Completed

- [x] Repository architecture, packages, persistence and guardrails inspected.
- [x] Existing implemented domain documented: organization, user, session, role,
      permission, organization settings, branch, product catalog and stock
      concepts.
- [x] Actual database tables documented: organizations, branches, measurement
      units, product categories, products, presentations, users and sessions.
- [x] Confirmed business requirements separated from proposed design.
- [x] Proposed business domain model documented, including branch ownership,
      raw/processed products, measurement and snapshot rules.
- [x] Previous roadmap identified as superseded.
- [x] Documentation/continuity system established.
- [x] M1-T1: Branch domain entity, repository port and dual-engine schema,
      migrations and repository implementations with isolation tests.
- [x] M1-T2: Product/category/unit/presentation domain model, dual-engine
      schema/migrations and repository implementations with isolation tests.
- [x] M1-T3: Required raw/processed product kind and average-weight
      configuration on presentations, both engines and repositories.
- [x] M1-T4: Stock movement, reason, source, balance and audit-safe correction
      concepts, with no stock table, port or API.
- [x] M1-T5: Access-model note covering the confirmed operator-only boundary,
      current roles and future branch-scope invariants, with no code changes.
- [x] M1-T6: Technical reference documents reconciled and the boundary guard
      extended for domain Node imports, schema-table parity and migration-journal
      parity.

### In Progress

None. M1 is complete.

### Pending

- [x] Branch API route and management UI (completed in M2-T1).
- [x] Category and unit API routes and management UI (M2-T4); product routes,
      product UI and the product-screen presentation editor (M2-T5).
- [ ] Seed the three branches once their names and codes are confirmed.
- [x] Product prices and price history (M2-T6).

### Validation

- Tests executed: `typecheck`, `lint`, unit/component/API tests (see summary).
- Passed: typecheck 12/12, lint 12/12 with `BOUNDARY GUARD OK`, guard
  `BOUNDARY GUARD OK`, tests 292 passed + 10 skipped, build 5/5.
- Integration suite passed with the SQLite override: 69 passed + 10 skipped.
- Failed: default `test:integration` without clearing `TEST_DATABASE_URL`
  (SI-06); the SQLite path passes with the override.
- Not executed: PostgreSQL integration tests, Playwright E2E.
- M2-T6 required schema and migration changes on both engines; SQLite migrations
  were applied through `0006` and the seed was rerun.
- M1-T5 changed documentation only; M1-T6 changed documentation and the guard.
  The forced suite was run after the guard change.
- The guard probes proved it rejects a one-engine table, a missing migration
  journal entry and a Node built-in import from shipped domain code.
- New M1-T4 tests: 17 stock tests covering valid creation, signed/finite/non-zero
  quantity, known reason, source reference, correction reference and runtime
  immutability.
- The full API suite has 48 passed + 3 skipped; the domain suite has 45 passed.
- PostgreSQL repository tests exist but were skipped without a reachable
  `TEST_DATABASE_URL`.

### Relevant files and modules

- `packages/domain/src/branch/*` — branch entity, validation and tests.
- `packages/domain/src/product/*` — units, categories, product kinds, products,
  presentations and catalog tests.
- `packages/domain/src/stock/*` — movement reasons, source types, movement
  factory, balance type and stock tests.
- `docs/project/ACCESS_MODEL.md` — confirmed access boundary, current roles and
  future branch-scope invariants.
- `docs/database.md` — current tables, both schema trees and both journals.
- `docs/backend.md`, `docs/testing.md`, `docs/architecture.md` — reconciled with
  the M1 domain, repository tests and guard behavior.
- `scripts/check-boundaries.mjs` — domain built-in ban plus schema/migration
  parity checks.
- `packages/domain/src/ports/index.ts` — catalog repository ports and
  `Repositories`.
- `packages/types/src/identifiers.ts` — catalog and stock movement branded ids.
- `database/schema/branch.ts`, `database/schema/catalog.ts`,
  `database/schema/enums.ts` and the SQLite equivalents.
- `database/migrations/0001_*` to `0003_*` and the SQLite equivalents.
- `apps/api/src/infrastructure/persistence/repositories/*` — PostgreSQL branch
  and catalog repositories.
- `apps/api/src/infrastructure/persistence/sqlite/repositories/*` — SQLite
  branch and catalog repositories.
- `apps/api/test/branch-repository.integration.test.ts` and
  `product-catalog-repository.integration.test.ts`.
- `packages/app/src/features/inventory/components/inventory-page.tsx` — placeholder.

### Important implementation decisions

- Branch is the inventory boundary (TD-001).
- Catalog master data is organization-wide; branches own stock, not the catalog
  (TD-009).
- Units are explicit organization-owned rows and products reference them by id.
  No conversion factor is stored while BQ-10 is open.
- A product has one category, a required inventory unit, a required sales unit,
  and optional purchase/production units.
- Products carry a required `RAW` or `PROCESSED` kind.
- Presentations are product-owned identities and require a positive
  `averageWeightGrams` (TD-010). The kind is not duplicated on the presentation.
- Prices, estimated/measured weights and historical snapshots are deferred.
- Branch and catalog reads take `organizationId` explicitly.
- The old generic roadmap is superseded (TD-008).
- Stock movements are append-only and corrections are new movements that
  reference the original (ADR 0040).
- A movement has a signed non-zero quantity, a controlled reason, an optional
  source reference and required organization, branch, product and actor.
- `StockBalance` is a type only; derived-versus-cached and negative-stock
  policies remain open (BQ-07, BQ-08).
- The initial access model is one organization-wide central operator; branch
  employees have no login. Future branch scope must be server-derived and is not
  implemented (BQ-09).
- Branch-scoped persistence is recorded in
  [ADR 0039](../decisions/0039-branch-scoped-persistence.md).
- The guard now rejects Node built-ins in shipped domain code. Tests may still
  use Node tooling.
- The guard compares declared table names in both schema trees and journal entry
  counts in both engines, so a one-engine schema or migration change fails.

### Known limitations

- At M1 closeout, `Branch` and the catalog had no API routes or UI. Branch was
  completed in M2-T1; catalog and product management were completed by M2-T5.
- Products have a kind, presentations have a configured average weight and
  selling prices now have effective-dated history. Estimated/measured weight
  snapshots and operational price consumption do not exist yet.
- Stock exists as a domain vocabulary only; there is no stock table, repository,
  API, balance calculation or inventory screen.
- At M1 closeout, no supplier, purchase, production, sales or closing entity
  existed; supplier master data was added in M2-T3.
- The inventory screen remains a static placeholder; the business UIs added so
  far cover master data and products.
- The development seed now includes sample master data for a fruit-and-vegetable
  store: 3 branches, 4 employees, 3 suppliers, 6 units, 4 categories, 21
  products, 6 presentations and 27 effective-dated price rows. These are
  illustrative development rows, not confirmed business data; their names are
  invented for the local store scenario and remain subject to BQ-19 and real
  master-data confirmation.
- The existing roles are foundation roles, not the owner/operator/branch model.
- There is no user-to-branch assignment or branch-scoped authorization.
- `data/` is git-ignored; a fresh clone must run migrations and seed.

### Next action

M1 is complete and committed as `bfdc9cb`. M2 is in progress; M2-T5 is committed
as `c8526d0` and M2-T6 is complete in the working tree. See
[CURRENT_TASK.md](./CURRENT_TASK.md).

---

## M2 — Master Data

**Status: COMPLETED (M2-T1 through M2-T7 complete)**

### Completed

- [x] M2-T1 branch name/active-state update behavior in the domain.
- [x] M2-T1 `BranchRepository.findByName` and `update` on SQLite and PostgreSQL.
- [x] M2-T1 branch validation schemas and inferred types.
- [x] M2-T1 authenticated `GET/POST/PUT /api/v1/branches` routes with
      `organization:read`/`organization:manage` permissions.
- [x] M2-T1 duplicate-name conflict, not-found and validation problem mapping.
- [x] M2-T1 typed REST-client branch functions with response validation.
- [x] M2-T1 Settings branch list/create/edit/deactivate UI for administrators,
      read-only for other authenticated roles.
- [x] M2-T1 reusable active-branch selector foundation.
- [x] M2-T1 domain, REST-client, dual-engine repository, route and component
      tests.
- [x] M2-T1 documentation and TD-011 access decision.
- [x] M2-T2 employee entity, trimmed name validation, `EmployeeId` and
      `EmployeeRepository` port.
- [x] M2-T2 organization-and-branch ownership on both engines, with migrations.
- [x] M2-T2 employee create/list/update repository methods on SQLite and
      PostgreSQL, including cross-organization isolation.
- [x] M2-T2 authenticated `GET/POST/PUT /api/v1/employees` routes with
      `organization:read`/`organization:manage` permissions and branch
      membership validation.
- [x] M2-T2 typed REST-client employee functions and response validation.
- [x] M2-T2 Settings employee list/create/edit/deactivate UI, read-only for
      non-administrators and branch assignment through the shared selector.
- [x] M2-T2 domain, REST-client, dual-engine repository, route and component
      tests.
- [x] M2-T2 documentation and TD-012 employee decision.
- [x] M2-T3 supplier entity, trimmed name validation, `SupplierId` and
      `SupplierRepository` port.
- [x] M2-T3 organization-wide supplier ownership on both engines, with
      migrations and a non-unique name.
- [x] M2-T3 supplier create/list/update repository methods on SQLite and
      PostgreSQL, including cross-organization isolation.
- [x] M2-T3 authenticated `GET/POST/PUT /api/v1/suppliers` routes with
      `organization:read`/`organization:manage` permissions.
- [x] M2-T3 typed REST-client supplier functions and response validation.
- [x] M2-T3 Settings supplier list/create/edit/deactivate UI, read-only for
      non-administrators and duplicate-name support.
- [x] M2-T3 domain, REST-client, dual-engine repository, route and component
      tests.
- [x] M2-T3 documentation and TD-013 supplier decision.
- [x] M2-T4 category, unit and presentation update behavior in the domain.
- [x] M2-T4 organization-scoped unique lookups and updates for units,
      categories and presentations on SQLite and PostgreSQL.
- [x] M2-T4 category, unit and nested presentation validation schemas and
      inferred types.
- [x] M2-T4 authenticated `GET/POST/PUT /api/v1/product-categories`,
      `/api/v1/measurement-units` and product-nested presentation routes.
- [x] M2-T4 duplicate-name/code conflicts, not-found and validation problem
      mapping.
- [x] M2-T4 typed REST-client category, unit and presentation functions with
      response validation.
- [x] M2-T4 Settings category and unit list/create/edit/deactivate UI, read-only
      for non-administrators.
- [x] M2-T4 domain, REST-client, dual-engine repository, route and component
      tests.
- [x] M2-T4 documentation and TD-014 catalog management decision.
- [x] M2-T5 product update behavior and organization-scoped reference validation
      in the domain.
- [x] M2-T5 `ProductRepository.update` on SQLite and PostgreSQL, including
      cross-organization isolation.
- [x] M2-T5 product validation schemas and inferred types.
- [x] M2-T5 authenticated `GET/POST/PUT /api/v1/products` routes with
      `organization:read`/`organization:manage` permissions.
- [x] M2-T5 product not-found, unknown-reference and validation problem mapping.
- [x] M2-T5 typed REST-client product functions with response validation.
- [x] M2-T5 dedicated `/products` list/create/edit/deactivate screen, read-only
      for non-administrators, with primary navigation and bilingual copy.
- [x] M2-T5 presentation editor inside the product screen for processed
      products, including create/edit/deactivate.
- [x] M2-T5 domain, REST-client, dual-engine repository, route and component
      tests.
- [x] M2-T5 documentation and TD-015 product-screen decision.
- [x] M2-T6 `ProductPriceHistory` entity, basis vocabulary, effective-date
      validation and append-only rule in the domain.
- [x] M2-T6 organization-scoped price-history port and dual-engine tables with
      unique product/effective-date constraints and indexes.
- [x] M2-T6 PostgreSQL and SQLite repositories with duplicate lookup,
      newest-first history and organization isolation.
- [x] M2-T6 generated migrations `0006` on both engines.
- [x] M2-T6 price create/list validation and response types, including the
      current organization currency in the list envelope.
- [x] M2-T6 authenticated product-nested price routes with read/manage
      permissions, 404 for unknown products and 409 for duplicate dates.
- [x] M2-T6 typed REST-client price functions with response validation.
- [x] M2-T6 `/products` price-history dialog and administrator create form with
      minor-unit parsing, currency/basis display and current/scheduled/past
      status, including bilingual copy.
- [x] M2-T6 domain, REST-client, dual-engine repository, route, formatting and
      component tests.
- [x] M2-T6 documentation and TD-016 price-history decision.
- [x] M2-T7 Playwright coverage for branch, employee, supplier, category and
      unit create/edit flows on `/settings`, including the duplicate-name
      problem and the read-only non-administrator view.
- [x] M2-T7 Playwright coverage for product create/edit, tray-presentation
      create, price-history display and effective-dated price creation on
      `/products`, including the read-only non-administrator view.
- [x] M2-T7 existing settings and i18n browser specs updated to mock the
      master-data list queries now mounted on `/settings`.

### Pending

- [ ] Raw-to-finished product relationship rules. Deferred to M5 by BQ-11:
      production inputs are free-form per batch and no recipe/BOM entity exists
      in the domain model.

### Validation

- Domain: 6 files, 74 passed.
- API client: 7 files, 37 passed.
- App: 16 files, 76 passed.
- API: 14 files, 95 passed + 10 skipped.
- SQLite integration command: 10 files, 69 passed + 10 skipped.
- Full typecheck, lint with boundary guard, build and formatting pass.
- SQLite migrations applied through `0006`; the development seed contains the
  sample fruit-and-vegetable catalogue (branches, employees, suppliers, units,
  categories, products, presentations and prices).
- PostgreSQL cases skip without a reachable `TEST_DATABASE_URL`.
- Browser E2E: 29 Chromium tests pass, including `master-data.spec.ts` and
  `products.spec.ts`; the specs run against the existing Vite server or the
  preview build when none is listening.

### Notes

Branch, employee, supplier, category, unit, product and presentation writes are
administrator-only through `organization:manage` (TD-011 through TD-015). All are
deactivated, never hard-deleted. Employees belong to one branch and are validated
against the caller's organization; branch sharing remains open (BQ-20).
Suppliers are organization-wide with non-unique names; contact, tax and payment
fields remain open (BQ-21). Categories and units are organization-wide; category
names and unit codes are unique per organization. Product names are not unique,
product kind is editable, and category/unit references are organization-scoped.
Presentations remain product-nested with unique names per product; the UI exposes
their editor for processed products (TD-015). Product prices are organization-wide
until BQ-06 is answered, append-only, effective-dated and store integer minor
units plus captured currency and kind-derived basis (TD-016). The development
seed now carries an illustrative fruit-and-vegetable catalogue, including sample
prices. Real branch names (BQ-19) and real master data still replace the sample
rows when confirmed. The raw-to-finished relationship is not a master-data
entity: BQ-11 leaves production inputs free-form per batch for M5.

### Next action

M2 is complete in the working tree; M2-T6, the sample seed and M2-T7 await an
explicit commit. After that, start M3 supplier purchases and receiving. See
[CURRENT_TASK.md](./CURRENT_TASK.md).

---

## M3 — Supplier Purchases and Receiving

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Purchase and purchase-item model.
- [ ] Branch/supplier assignment.
- [ ] Multi-line purchase entry.
- [ ] Receiving confirmation and stock effect.
- [ ] Purchase-price history.
- [ ] Auditable corrections.
- [ ] UI and tests.

### Validation

No implementation and no tests.

### Notes

Receiving must be idempotent and update stock only once. Correction mechanism is
pending.

### Next action

Start after M1/M2 are verified.

---

## M4 — Branch Inventory

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Movement ledger and balance decision.
- [ ] Raw and finished stock.
- [ ] Adjustments.
- [ ] Damaged/discarded products.
- [ ] Reconciliation.
- [ ] Stock validation and UI.
- [ ] Tests.

### Validation

No implementation and no tests. The `/inventory` route renders a static card.

### Notes

Do not build the stock list before the movement model is decided.

### Next action

Start after M1 and the stock effects of M3.

---

## M5 — Production

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Batch/input/output model.
- [ ] Employee preparer and operator identity.
- [ ] Tray count, average-weight snapshot and estimated weight.
- [ ] Optional raw consumption.
- [ ] Waste/losses.
- [ ] Inventory integration.
- [ ] UI and tests.

### Validation

No implementation and no tests.

### Notes

Raw consumption is optional pending business confirmation.

### Next action

Start after M1, M2 and M4.

---

## M6 — Sales Checkpoints

**Status: NOT_STARTED (finalization blocked on BR-013)**

### Completed

- [ ] Nothing.

### Pending

- [ ] Checkpoint/period model.
- [ ] Aggregate product lines.
- [ ] Processed tray → estimated kg calculation.
- [ ] Raw kg/unit lines.
- [ ] Weight and price snapshots.
- [ ] Waste separation.
- [ ] Correction audit.
- [ ] UI and tests.

### Validation

No implementation and no tests.

### Notes

The exact WhatsApp fields are not confirmed. Build the generic model only after
the product confirms the reported fields, or mark the feature as pending.

### Next action

Confirm BR-013, then start after M1/M2/M4.

---

## M7 — Daily Closing

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Aggregation of purchases, production, sales, waste and stock.
- [ ] Estimated revenue, cost and gross profit.
- [ ] Review/confirm/reopen workflow.
- [ ] Audit history.
- [ ] UI and tests.

### Validation

No implementation and no tests.

### Notes

Cost basis is undecided. Do not hardcode one.

### Next action

Start after M3–M6 and the cost-basis decision.

---

## M8 — Dashboard and Reports

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Consolidated dashboard.
- [ ] Sales/purchases/production/inventory/waste reports.
- [ ] Estimated profit reporting.
- [ ] Daily/weekly/monthly periods.
- [ ] Export.
- [ ] Tests.

### Validation

No implementation and no tests. `/dashboard` is static foundation content.

### Next action

Start only when the source records exist and are confirmed.

---

## M9 — Quality, Permissions and Operational Hardening

**Status: NOT_STARTED**

### Completed

- [x] Foundation quality gates exist: typecheck, lint, boundary guard, unit tests.

### Pending

- [ ] Business-flow test coverage.
- [ ] Branch-specific access control.
- [ ] Audit log.
- [ ] Backup and recovery drills.
- [ ] Performance and reliability.
- [ ] CI pipeline.
- [ ] Release documentation.

### Validation

Foundation gates pass. No backup drill, performance test or CI pipeline exists.

### Next action

Continuous hardening; final milestone before release.
