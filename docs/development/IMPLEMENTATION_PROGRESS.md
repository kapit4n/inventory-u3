# Inventory U3 — Implementation Progress

> This is the main progress document. Update it at the end of every session.
> Do not mark a task complete unless the repository and its tests prove it.

## Summary

| Field                  | Value                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| Current milestone      | M9 — Quality, Permissions and Operational Hardening (in progress) |
| Current task           | BQ-09-independent hardening; CI workflow added                    |
| Overall project status | M8 committed; M9 CI workflow added, GitHub run not yet verified   |
| Completed milestones   | A prerequisite and M1 through M8                                  |
| In-progress milestones | M9; M6/M7/M8 follow-ups blocked on BR-013/BQ-02/BQ-10/BQ-16/BQ-17 |
| Blocked milestones     | Final WhatsApp fields on BR-013; branch access on BQ-09           |
| Pending milestones     | M9 remaining hardening                                            |
| Last verified commit   | `634e58f` (M9 CI); GitHub run pending                             |
| Last update date       | 2026-11-17                                                        |
| Next recommended task  | Verify CI on GitHub; continue independent M9 hardening            |

### State at the time of this update

M8 replaces the static `/dashboard` with on-demand consolidated reports. One
domain report builder and one repository port are implemented by both engines.
The report aggregates confirmed sales checkpoints and production batches,
received purchases, inventory movements and both waste sources for a required
`from`/`to` range, with optional branch filter and `day | week | month`
granularity. Estimated profit reuses the M7 latest-purchase cost rule and counts
missing same-unit costs. Periods use the organization timezone, with Monday week
starts and month starts on day one. The UI has a seven-day default range,
summary cards, detail tables, filters and a localized CSV export saved through
the platform abstraction. See ADR 0045 and TD-022. No report tables or
migrations were added.

M7 adds versioned daily closings on top of M3–M6. A closing belongs to one
branch and business date and snapshots opening, purchasing, production, sales,
waste, adjustments, corrections, reconciliation differences and closing stock.
Revenue comes from confirmed sales-checkpoint snapshots; estimated cost uses the
latest received purchase price for the product in the branch when the purchase
unit equals the item unit. Missing cost is `UNAVAILABLE`, zero cost and counted
as a warning. Review, confirmation and reopening keep the confirmed snapshot:
reopening marks it `REOPENED` and creates a new draft version linked by
`previousClosingId`. The `/daily-closings` screen, API, typed client,
dual-engine persistence and tests are implemented. Day bounds use the
organization timezone until BQ-16 is confirmed; unit conversion remains BQ-10.
See ADR 0044 and TD-021.

M6 adds aggregate branch sales on top of the M4 ledger. A checkpoint belongs to
one branch, business date and provisional `MORNING | EVENING` period. Lines
snapshot product kind, unit, quantity, processed presentation/tray weight,
measured-or-estimated basis, and the selling price effective on the business
date. Confirmation appends one negative `SALES_CHECKPOINT` movement per line and
refuses negative stock; one audited full reversal moves a confirmed checkpoint
to `CORRECTED`. The `/sales-checkpoints` screen, API, typed client, dual-engine
persistence, seed data and tests are implemented. Final WhatsApp fields wait for
BR-013; configurable periods wait for BQ-02 and no-sales checkpoints for BQ-17.
See ADR 0043 and TD-020.

M5 adds branch production on top of the M4 ledger. Batches record the preparer,
registering operator, business date, tray counts, average-weight snapshots,
optional measured weight, optional raw inputs and explicit waste. Confirmation
appends one net movement per product and refuses negative stock; a confirmed
batch can be fully reversed once through an audited correction. The `/production`
screen, API, typed client, dual-engine persistence and tests are implemented.
See ADR 0042 and TD-019.

M4 remains the inventory foundation: a branch/product balance is derived by
summing its movements; no `stock_balances` cache table exists (ADR 0041,
TD-018). Quantities are exact integer thousandths everywhere.
Operators can record signed manual adjustments, positive waste and physical
counts; reconciliation stores expected and counted quantities and writes a
movement only for a non-zero difference. Any operation that would leave negative
stock is refused. The `/inventory` screen provides the branch stock table,
per-product movement history, adjustment/waste/count dialogs, empty states and
role-aware actions. Migration `0009` converts existing decimal movements and adds
`stock_adjustments`, `inventory_waste` and the branch/product index on both
engines.

M3 adds the supplier-purchase flow on top of the M2 master data. A purchase is
registered for one branch and supplier with immutable multi-line items, integer
thousandth quantities, integer minor-unit prices and captured organization
currency. Receiving is a transactional, one-shot `DRAFT -> RECEIVED` transition
that appends one `RECEIVING` stock movement per line; drafts can be cancelled
without stock effect. A received purchase can be fully reversed through a
required-reason correction that stores actor, reason and before/after totals and
appends one compensating `CORRECTION` movement per receipt movement (TD-017).
`/purchases` provides the list, multi-line form, receive/cancel actions and
correction dialog.

Both engines have purchase, correction and stock-movement repositories. The
migration set is `0007` for the four M3 tables and `0008` for the
`PURCHASE_CORRECTION` source type, the SQLite source-type check rebuild and the
unique organization/purchase correction index. M3 writes the movement ledger;
M4 builds derived balances and the inventory UI on top of it.

M2-T6 adds an append-only, effective-dated `product_price_history` domain entity,
port, dual-engine tables and repositories, validation, authenticated price
routes, typed client functions, and a `/products` price-history dialog and form.
Rows capture integer minor units, organization currency, the product-kind-derived
basis and an ISO effective date. Changing a price appends a row; existing rows are
never edited or deleted. Prices are organization-wide for now (BQ-06) and the
basis is snapshotted so later product-kind edits cannot reinterpret history
(TD-016). Average weight remains presentation master data; historical weight
snapshots belong to M5/M6 operational records. M2-T4 is committed as `992d6ea`;
M2-T5 is committed as `c8526d0`; M2-T6, the sample seed and M2-T7 are committed
as `cc70bfc`.

M2-T7 adds Playwright browser coverage for the master-data cards on `/settings`
(branches, employees, suppliers, categories and units) and for `/products`
(products, tray presentations and effective-dated prices), including read-only
behavior for non-administrators. The existing settings spec now mocks the
master-data list queries so the expanded page stays console-error free.

## Verification for this update

M8 changes the domain, application use cases, both repository implementations,
validation, API routes, REST client, React UI, tests and documentation. It adds
no schema, migration or seed changes.

| Command                                                                   | Result                                                               |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm run format:check`                                                   | PASS                                                                 |
| `pnpm run typecheck`                                                      | PASS — 12/12 tasks                                                   |
| `pnpm run lint`                                                           | PASS — 12/12 tasks, `BOUNDARY GUARD OK`; one React Compiler warning  |
| `pnpm run guard:boundaries`                                               | PASS — `BOUNDARY GUARD OK`                                           |
| `pnpm run test`                                                           | PASS — 12/12 tasks, 437 passed, 13 skipped                           |
| `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` | PASS — 16 files, 109 passed, 13 skipped                              |
| `pnpm run build`                                                          | PASS — 5/5 tasks; Vite chunk-size warnings only                      |
| `pnpm run db:migrate`                                                     | NOT RERUN — M8 adds no schema change; local SQLite remains at `0012` |
| `pnpm run db:seed`                                                        | NOT RERUN — M8 adds no seed change                                   |
| `pnpm run test:e2e`                                                       | PASS — 48 Chromium tests, including two dashboard specs              |

Current test counts: domain 143, api-client 51, app 98, API 135 passed + 13
skipped, database 6 and desktop 4 — 437 passed and 13 skipped in total, plus 48
browser tests. The skipped tests are PostgreSQL repository cases, which require a
reachable `TEST_DATABASE_URL`.

The local SQLite seed still contains 10 sales checkpoints, 24 lines and 57 ledger
rows, with no negative branch/product balance. It contains no purchases, so M7
closings and M8 cost estimates report `missingCostProductCount` until purchase
fixtures are added.

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

M1 is complete and committed as `bfdc9cb`. M2 is complete and committed as
`cc70bfc`. See [CURRENT_TASK.md](./CURRENT_TASK.md).

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

M2 is complete and committed as `cc70bfc`. M3 is complete and committed as
`13b8fcd`. See [CURRENT_TASK.md](./CURRENT_TASK.md).

---

## M3 — Supplier Purchases and Receiving

**Status: COMPLETED**

### Completed

- [x] Purchase, purchase-item and purchase-correction domain entities, statuses,
      totals, integer-thousandth quantities and validation rules.
- [x] `PurchaseId`, `PurchaseItemId` and `PurchaseCorrectionId`, repository ports
      and the `INVALID_STATE` domain error mapped to a 409 problem.
- [x] Dual-engine `purchases`, `purchase_items`, `purchase_corrections` and
      `stock_movements` schema, migrations `0007`/`0008`, indexes and unique
      correction key.
- [x] PostgreSQL and SQLite purchase, correction and stock-movement repositories
      with branch/organization isolation.
- [x] Transactional receiving use case: full purchase, exactly once, one
      `RECEIVING` movement per line.
- [x] Transactional correction use case: audited full reversal with required
      reason, before/after totals and compensating movements.
- [x] Purchase validation schemas and inferred types.
- [x] Authenticated purchase routes with `inventory:read`/`inventory:write`,
      reference validation, unit equality and problem mapping.
- [x] Typed REST-client purchase functions and response validation.
- [x] `/purchases` list, multi-line create form, receive/cancel actions,
      correction dialog, primary navigation and bilingual copy.
- [x] Domain, dual-engine repository, route, REST-client, component and Playwright
      tests.

### Pending

None for M3. Partial receiving, taxes, freight, shared deliveries and unit
conversion remain open business questions (BQ-10, BQ-13, BQ-14, BQ-15). A revised
replacement purchase after a correction is not part of M3.

### Validation

- Domain: 7 files, 99 passed (25 purchase tests).
- API client: 8 files, 42 passed (5 purchase tests).
- App: 18 files, 81 passed (2 purchase-page and 3 quantity tests).
- API unit/integration-style suite: 16 files, 103 passed + 12 skipped.
- SQLite integration command: 12 files, 77 passed + 12 skipped.
- Full root suite: 335 passed + 12 skipped.
- Typecheck, lint with boundary guard, build and formatting pass.
- SQLite migrations applied through `0008`.
- Browser E2E: 32 Chromium tests pass, including three purchase tests.
- PostgreSQL cases skip without a reachable `TEST_DATABASE_URL`; they were not
  executed (SI-06).

### Notes

Receiving is all-or-nothing and idempotent. Purchase prices are preserved by
immutable received items; no separate purchase-price table was added. Correction
is a full reversal (`afterTotalMinor = 0`), never a silent edit, and at most one
correction is stored per purchase. Stock movements are append-only and now
persisted; balances, adjustments, waste and reconciliation are M4. See TD-017
and `docs/workflows/PURCHASE_WORKFLOW.md`.

### Next action

M4 is complete and committed as `8f5f326`. Start M5 production.

---

## M4 — Branch Inventory

**Status: COMPLETED and committed as `8f5f326`**

### Completed

- [x] Derived balance strategy and integer-thousandth quantity decision
      (ADR 0041, TD-018).
- [x] Dual-engine migration `0009` from decimal movements to
      `quantity_delta_milli`, plus `stock_adjustments`, `inventory_waste` and the
      branch/product index.
- [x] Domain stock adjustment, inventory waste, reconciliation entry and
      negative-stock rule.
- [x] PostgreSQL and SQLite movement timeline/balance queries, adjustment and
      waste repositories.
- [x] Adjustment, waste and reconciliation use cases with reference validation
      and branch isolation.
- [x] Purchase receiving/correction updated for milli quantities and negative
      balance refusal.
- [x] Authenticated inventory read/write routes, typed client and validation.
- [x] Branch-aware `/inventory` UI with stock table, history, adjustment, waste,
      reconciliation, empty states, permissions and bilingual copy.
- [x] Domain, dual-engine integration, REST-client, component and Playwright
      tests.

### Pending

- [x] M4 committed as `8f5f326`.

### Validation

- `format:check`, `typecheck` 12/12, `lint` 12/12 with `BOUNDARY GUARD OK`,
  `guard:boundaries`, `build` 5/5, and `db:migrate` through `0009`: PASS.
- `pnpm run test`: PASS, 361 passed and 13 skipped.
- SQLite integration suite: PASS, 13 files, 82 passed and 13 skipped.
- Chromium E2E: PASS, 36 tests, including four inventory specs.
- Migration `0009` verified against the existing local database with all eight
  movement rows converted exactly.
- PostgreSQL cases skip without a reachable `TEST_DATABASE_URL`; they were not
  executed (SI-06).

### Notes

Balances are derived from the append-only ledger; no cache table exists. A zero
balance is a valid derived result. Negative stock is always refused. Waste is
stored as a positive quantity and posted as a negative movement. Reconciliation
keeps expected/counted evidence and posts nothing for a zero difference. Opening
stock is a positive manual adjustment.

### Next action

Start M5 production on top of the ledger.

---

## M5 — Production

**Status: COMPLETE and committed as `7441653`.**

### Completed

- [x] Production batch, input, output and waste domain model with
      `DRAFT | CONFIRMED | CORRECTED` transitions.
- [x] Employee preparer and registering operator identity.
- [x] Tray count, average-weight snapshot, estimated weight and optional measured
      weight with `ESTIMATED | MEASURED` basis.
- [x] Optional raw consumption; at least one line across inputs, outputs or waste.
- [x] Waste/losses as a separate line affecting branch stock.
- [x] Confirmation appends one net movement per product to the M4 ledger and
      refuses negative stock.
- [x] Audited full correction with linked `CORRECTION` movements and a required
      reason; draft discard via `DELETE`.
- [x] PostgreSQL and SQLite schemas, migrations, repositories and registries.
- [x] Validation schemas, use cases and six authenticated REST endpoints.
- [x] Typed API client, React Query hooks, `/production` UI, dialogs and
      English/Spanish copy.
- [x] Domain, dual-engine integration, client, component and Playwright coverage.
- [x] ADR 0042, TD-019, workflow, roadmap and continuity documentation.

### Pending

- [ ] Execute the PostgreSQL half of the integration suite on a machine with a
      server; it skips locally (SI-06).

### Validation

- `pnpm run format:check` — PASS.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 385 passed and 13 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 14 files, 90 passed and 13 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 40 Chromium tests, including four production specs.
- PostgreSQL integration cases were skipped because no server is available
  (SI-06), not passed.
- `apps/api/test/production.integration.test.ts` covers creation and ledger
  equality, branch filtering, measured weight, correction audit/reversal,
  duplicate confirmation, insufficient stock, draft discard, invalid references
  and 404.
- Component and Playwright tests cover form payloads, confirmation, correction
  and discard.

### Notes

Raw consumption is optional. An input-only batch is valid in the domain even
though operators normally register outputs. Production stores quantities and
weights, not prices; valuation remains open (BQ-11, BQ-12). See ADR 0042 and
TD-019.

### Next action

M5 is complete. Start M6 after the M4/M5 verification and continuity docs are
unchanged; BR-013 still blocks the final reporting contract.

---

## M6 — Sales Checkpoints

**Status: COMPLETE and committed as `52e39a3`. Reporting contract blocked on
BR-013.**

### Completed

- [x] Checkpoint and item domain model with `DRAFT | CONFIRMED | CORRECTED`
      transitions and provisional `MORNING | EVENING` periods.
- [x] Aggregate product lines; no individual sales records.
- [x] Processed tray → estimated grams with optional measured weight.
- [x] Raw kg/unit lines with the inventory-unit guard (no conversion).
- [x] Weight and effective-dated selling-price snapshots with integer value
      calculation.
- [x] Waste excluded from sales; waste remains the M4 workflow.
- [x] Confirmation appends negative movements and refuses negative stock.
- [x] One audited full correction with required reason and linked reversals;
      draft discard via `DELETE`.
- [x] PostgreSQL and SQLite schemas, migrations `0011`, repositories and
      registries.
- [x] Validation schemas, use cases and six authenticated REST endpoints.
- [x] Typed API client, React Query hooks, `/sales-checkpoints` UI and
      English/Spanish copy.
- [x] Domain, dual-engine integration, client, component and Playwright coverage.
- [x] Seeded draft, confirmed and corrected checkpoints with matching movements.
- [x] ADR 0043, TD-020, workflow, database, roadmap and continuity documentation.

### Pending

- [ ] Final WhatsApp fields, order, labels and mandatory fields (BR-013).
- [ ] Configurable or time-derived checkpoint periods (BQ-02).
- [ ] Explicit no-sales checkpoints (BQ-17).
- [ ] Unit conversion when raw sales and inventory units differ (BQ-10).
- [ ] Execute the PostgreSQL half of the integration suite on a machine with a
      server; it skips locally (SI-06).
- [ ] Commit authorization.

### Validation

- `pnpm run format:check` — PASS.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 410 passed and 13 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 15 files, 100 passed and 13 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 44 Chromium tests, including four
  sales-checkpoint specs.
- `pnpm run db:seed` — PASS on SQLite; 10 checkpoints, 24 items, 21 sales/correction
  movements and no negative balances.
- PostgreSQL integration cases were skipped because no server is available
  (SI-06), not passed.
- `apps/api/test/sales-checkpoints.integration.test.ts` covers snapshots,
  confirmation into stock, branch filtering, correction audit/reversal,
  duplicate periods, missing prices, invalid references, negative stock, draft
  discard and 404.

### Notes

M6 implements the generic model only. Period names and all WhatsApp field
requirements remain provisional until product confirms BR-013/BQ-02. A no-sales
checkpoint is intentionally unsupported until BQ-17. Raw unit conversion is
intentionally refused while BQ-10 is open. See ADR 0043 and TD-020.

### Next action

M6 is complete and committed; M7 daily closing followed.

---

## M7 — Daily Closing

**Status: COMPLETED; committed as `e04bafa`.**

### Completed

- [x] Daily-closing domain model with version, status and snapshot transitions.
- [x] Opening, purchased, produced, sold, waste, adjustment, correction,
      reconciliation and closing quantities per product.
- [x] Estimated revenue from confirmed sales snapshots.
- [x] Latest received purchase-price costing with same-unit guard and
      `UNAVAILABLE` missing-cost fallback.
- [x] Estimated cost and gross profit with integer-safe rounding.
- [x] Readiness warnings for missing purchases, production drafts, unreceived
      purchases, waste, inventory differences, negative stock and missing cost.
- [x] Review, confirmation and audited reopening that creates a new version.
- [x] PostgreSQL and SQLite schemas, migrations `0012`, repositories and
      registries.
- [x] Validation schemas, snapshot/create/review/confirm/reopen use cases and six
      authenticated REST endpoints.
- [x] Typed API client, React Query hooks, `/daily-closings` UI and
      English/Spanish copy.
- [x] Domain, SQLite integration, component and Playwright coverage.
- [x] ADR 0044, TD-021, workflow, database, roadmap and continuity documentation.

### Pending

- [ ] Resolve BQ-16 for branch or non-midnight business-day boundaries.
- [ ] Resolve BQ-10 before converting mismatched purchase and item units.
- [ ] Resolve BQ-14 for tax/freight treatment in cost.
- [ ] Execute the PostgreSQL half of the integration suite on a machine with a
      server; it skips locally (SI-06).
- [ ] Optional seed purchases so a seeded closing demonstrates available cost.
- [ ] Optional record-level drill-down links from the closing summary.

### Validation

- `pnpm run format:check` — PASS after the final Prettier pass.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`; one React Compiler
  warning for React Hook Form `watch()` in the create dialog.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 426 passed and 13 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 16 files, 107 passed and 13 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 46 Chromium tests, including two daily-closing
  specs.
- `pnpm run db:migrate` — PASS on SQLite through `0012`.
- `pnpm run db:seed` — PASS on SQLite; 10 checkpoints, 24 lines, 57 ledger rows
  and no negative balances. The seed has no purchases, so closing cost is
  reported as missing.
- PostgreSQL integration cases were skipped because no server is available
  (SI-06), not passed.

### Notes

M7 implements the confirmed latest-purchase-price cost basis. Revenue is never
recomputed from current prices. Confirmed versions are immutable; reopening
creates a new draft. Missing same-unit cost is surfaced rather than guessed.
Branch timezones and non-midnight business days remain open (BQ-16). See ADR
0044 and TD-021.

### Next action

M7 was committed as `e04bafa`; M8 consolidated reporting followed.

---

## M8 — Dashboard and Reports

**Status: COMPLETED; committed as `9099246`.**

### Completed

- [x] Pure domain report builder with consolidated totals, section rows, branch
      filters, period grouping and capped detail rows.
- [x] One `ReportRepository.readSources(...)` port with SQLite and PostgreSQL
      implementations and registrations.
- [x] Application use case, Zod query/response schemas and authenticated
      `GET /api/v1/reports/summary` with HTTP 422 validation errors.
- [x] Typed API client, React Query hook and `/dashboard` UI with date, branch
      and granularity filters.
- [x] Sales by branch/product, purchases by supplier/product, production by
      product, remaining inventory, waste/damage, checkpoint counts and
      estimated profit sections.
- [x] Daily/weekly/monthly grouping in the organization timezone; weeks start
      Monday and months start on day one.
- [x] Latest-purchase estimated cost with same-unit guard and missing-cost count.
- [x] Localized CSV export through `usePlatform().saveFile`, with currency-aware
      minor-unit scaling.
- [x] English/Spanish dashboard copy and empty/error states.
- [x] Domain, SQLite integration, component and Chromium browser coverage.
- [x] ADR 0045, TD-022, roadmap and continuity documentation.

### Pending

- [ ] Resolve BR-013 before treating WhatsApp/report fields as final.
- [ ] Resolve BQ-02 before making checkpoint/report periods configurable.
- [ ] Resolve BQ-10 before converting mismatched purchase and item units.
- [ ] Resolve BQ-14 before treating tax/freight as part of cost.
- [ ] Resolve BQ-16 for branch or non-midnight business-day boundaries.
- [ ] Resolve BQ-17 for no-sales reporting.
- [ ] Measure report-query performance in M9 before adding indexes or
      materialization.
- [ ] Execute PostgreSQL integration cases on a machine with a server (SI-06).
- [x] M8 committed as `9099246`.

### Validation

- `pnpm run format:check` — PASS.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`; one pre-existing
  React Compiler warning for React Hook Form `watch()`.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 437 passed and 13 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 16 files, 109 passed and 13 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 48 Chromium tests, including two dashboard specs.
- PostgreSQL integration cases were skipped because no server is available
  (SI-06), not passed.

### Notes

Reports are computed on demand from source records rather than stored as report
snapshots (ADR 0045, TD-022). Confirmed checkpoints and batches, received
purchases, the stock ledger and both waste sources are the sources of truth.
Estimated cost reuses the M7 latest-purchase rule and remains labeled estimated.
No WhatsApp contract, configurable period rule, unit conversion, tax/freight
treatment, branch business-day boundary or no-sales marker was invented.

### Next action

Start M9 quality, permissions and operational hardening. Resolve BQ-09 before
implementing branch access.

---

## M9 — Quality, Permissions and Operational Hardening

**Status: IN_PROGRESS**

### Completed

- [x] Foundation quality gates exist: typecheck, lint, boundary guard, unit tests.
- [x] CI workflow added for formatting, typecheck, lint/boundary guard, unit and
      component tests, SQLite integration tests, build, Chromium install and
      browser tests.
- [x] CI-style browser setup validated locally with `CI=true` and a manually
      started web preview server.
- [x] Audit review completed: per-entity evidence mapped for M3-M7; gaps recorded
      as BQ-22 and existing BQ-03 rather than silently choosing a new audit model.
- [x] SQLite backup/restore drill executed successfully against the default
      development database.
- [x] SQLite report/movement query baseline recorded on seeded data; no pass/fail
      target claimed because BQ-23 is open.

### Pending

- [ ] Verify the CI workflow on GitHub.
- [ ] Business-flow test coverage.
- [ ] Branch-specific access control; blocked on BQ-09.
- [ ] Audit history scope; blocked on BQ-22 and BQ-03.
- [ ] PostgreSQL backup/restore drill; blocked locally by SI-06.
- [ ] Performance acceptance; blocked on BQ-23.
- [ ] Release documentation.

### Validation

Foundation gates pass. The CI workflow is formatted and its browser-test path was
reproduced locally: 48 Chromium tests passed with `CI=true`. The GitHub Actions
run itself has not executed yet. A general audit table remains undecided (BQ-22);
per-entity correction evidence is implemented and tested on SQLite, while
PostgreSQL parity remains skipped locally (SI-06). A seeded-data performance
baseline exists, but BQ-23 has no target, and the release checklist below still
has open blockers.

### Backup and restore procedure

**SQLite:** stop API/migrator writes, use `better-sqlite3`'s online backup API from
`apps/api` to copy `data/inventory-u3.db` to a durable destination, verify
`integrity_check` and `foreign_key_check`, then restore by copying the verified
backup over the target file while the application is stopped and rerunning the
same checks plus a smoke test. The local drill backed up the seeded development
database, restored a copy, and confirmed 26 tables with matching row counts and
SHA-256 hashes; both integrity checks were clean.

**PostgreSQL:** on a host with client tools, create a custom-format dump with
`pg_dump --format=custom --file=inventory-u3.dump "$DATABASE_URL"`. Restore into
a scratch database first with
`pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$RESTORE_DATABASE_URL" inventory-u3.dump`,
verify row counts and application smoke tests, then cut over only after
approval. This drill has not been executed locally: no PostgreSQL server or
`pg_dump` is available (SI-06).

### Performance baseline

Measured with `better-sqlite3` against the seeded development database, 40 runs
per query, median/p95 in milliseconds:

| Query                           | Rows | Median | p95    | Plan                                                                |
| ------------------------------- | ---- | ------ | ------ | ------------------------------------------------------------------- |
| Sales lines for a report period | 13   | 0.0388 | 0.1152 | `sales_checkpoint_items_organization_product_idx`, temp B-tree sort |
| Stock balance before period end | 57   | 0.0090 | 0.0128 | `stock_movements_organization_product_occurred_idx`                 |

This is a baseline, not a pass/fail result: the dataset is small, PostgreSQL was
not measured, and no latency target or production-size dataset exists (BQ-23).

### Release readiness checklist

- [x] Formatting, typecheck, lint, boundary guard, unit/component tests and build
      are green locally.
- [x] Browser tests are green locally and in a CI-style `CI=true` run.
- [x] SQLite backup/restore drill passed.
- [ ] CI workflow has executed on GitHub.
- [ ] PostgreSQL integration and backup/restore drills have run on a server.
- [ ] BQ-09 branch access, BQ-03 correction approval, BQ-22 audit scope and
      BQ-23 performance target are answered where applicable.
- [ ] Final reporting questions BR-013, BQ-02, BQ-10, BQ-14, BQ-16 and BQ-17 are
      resolved.

This checklist is documentation of current readiness, not a release approval.

### Next action

Verify CI on the first push or pull request, then continue independent hardening.
Ask for BQ-09, BQ-03, BQ-22 and BQ-23 input before authorization, general audit
or performance acceptance work.
