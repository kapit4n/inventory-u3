# Inventory U3 — Implementation Progress

> This is the main progress document. Update it at the end of every session.
> Do not mark a task complete unless the repository and its tests prove it.

## Summary

| Field                  | Value                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| Current milestone      | M2 — Master Data (in progress); M1 is complete                          |
| Current task           | M2-T2 complete; next task is supplier master data (M2-T3)               |
| Overall project status | Branch and employee master data delivered on the M1 business foundation |
| Completed milestones   | M1; the foundation prerequisite is also complete                        |
| In-progress milestones | M2                                                                      |
| Blocked milestones     | M6 finalization is blocked on BR-013 (WhatsApp reporting format)        |
| Pending milestones     | M3, M4, M5, M6, M7, M8, M9                                              |
| Last verified commit   | `6b50606` (M2-T2); M2-T1 `814f397`                                      |
| Last update date       | 2026-11-09                                                              |
| Next recommended task  | Continue M2 with supplier master data                                   |

### Working tree at the time of this update

M2-T2 adds the employee domain entity, `EmployeeId`, `EmployeeRepository` on both
engines, dual-engine schema and migrations, employee validation, typed REST-client
functions, `GET/POST/PUT /api/v1/employees`, the Settings employee-management
section and tests. Employees carry organization and branch references, are
validated against a branch in the same organization, and are deactivated rather
than deleted. No employee seed was added because real names are unavailable.
Branch-local employee ownership is an assumption pending BQ-20 (TD-012). The
changes are committed as `6b50606`.

## Verification for this update

M2-T2 changes the domain, both repository implementations, schema and
migrations, API routes, REST client, React UI, tests and documentation.

| Command                                                                   | Result                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `pnpm run typecheck`                                                      | PASS — 12/12 tasks                                           |
| `pnpm run lint`                                                           | PASS — 12/12 tasks, `BOUNDARY GUARD OK`                      |
| `pnpm run guard:boundaries`                                               | PASS via lint — `BOUNDARY GUARD OK`                          |
| `pnpm run test`                                                           | PASS — 12/12 tasks, 209 passed, 6 skipped                    |
| `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` | PASS — 7 files, 42 passed, 6 skipped                         |
| `pnpm run build`                                                          | PASS — 5/5 tasks; Vite chunk-size warnings only              |
| `pnpm run db:migrate`                                                     | PASS — SQLite migrations applied through `0004`              |
| `pnpm run db:seed`                                                        | PASS — organization and development users only; no employees |
| `pnpm run format:check`                                                   | PASS — all files use Prettier style                          |
| `pnpm run test:e2e`                                                       | NOT RUN; branch and employee management have RTL coverage    |

Current test counts: domain 55, api-client 23, app 53, API 68 passed + 6 skipped,
database 6 and desktop 4 — 209 passed and 6 skipped in total. The skipped tests
are the PostgreSQL branch, employee and catalog repository cases, which require a
reachable `TEST_DATABASE_URL`. The full typecheck, lint, test, build and SQLite
integration suite were re-run after the final Prettier pass.

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
- [ ] Catalog API routes and management UI (M2).
- [ ] Seed the three branches once their names and codes are confirmed.
- [ ] Product prices and price history (M2).

### Validation

- Tests executed: `typecheck`, `lint`, unit/component/API tests (see summary).
- Passed: typecheck 12/12, lint 12/12 with `BOUNDARY GUARD OK`, guard
  `BOUNDARY GUARD OK`, tests 166 passed + 3 skipped, build 5/5.
- Integration suite passed with the SQLite override: 22 passed + 3 skipped.
- Failed: default `test:integration` without clearing `TEST_DATABASE_URL`
  (SI-06); the SQLite path passes with the override.
- Not executed: PostgreSQL integration tests, Playwright E2E.
- No schema change, migration, seed or database test was required for M1-T6.
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
  completed in M2-T1; the catalog remains a domain/persistence slice.
- Products have a kind and presentations have a configured average weight, but
  prices, estimated/measured weights and snapshots do not exist.
- Stock exists as a domain vocabulary only; there is no stock table, repository,
  API, balance calculation or inventory screen.
- No supplier, purchase, production, sales or closing entity exists.
- The only business-looking UI is a static inventory placeholder.
- The three development branches are not seeded because their names are not confirmed.
- The existing roles are foundation roles, not the owner/operator/branch model.
- There is no user-to-branch assignment or branch-scoped authorization.
- `data/` is git-ignored; a fresh clone must run migrations and seed.

### Next action

M1 is complete and committed as `bfdc9cb`. M2 is now in progress; M2-T1 is
complete. See [CURRENT_TASK.md](./CURRENT_TASK.md).

---

## M2 — Master Data

**Status: IN_PROGRESS (M2-T1 and M2-T2 complete)**

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

### Pending

- [ ] Supplier master data.
- [ ] Product categories.
- [ ] Products (raw and processed).
- [ ] Measurement units.
- [ ] Product presentations.
- [ ] Average weight per tray configuration.
- [ ] Selling prices and price history.
- [ ] Raw-to-finished product relationship rules.

### Validation

- Domain: 5 files, 55 passed.
- API client: 3 files, 23 passed.
- App: 10 files, 53 passed.
- API: 11 files, 68 passed + 6 skipped.
- SQLite integration command: 7 files, 42 passed + 6 skipped.
- Full typecheck, lint with boundary guard, build and formatting pass.
- SQLite migrations applied through `0004`; seed contains no employees.
- PostgreSQL cases skip without a reachable `TEST_DATABASE_URL`.
- No browser E2E spec was added for branch or employee management.

### Notes

Branch and employee writes are administrator-only through
`organization:manage` (TD-011, TD-012). Both are deactivated, never hard-deleted.
Employees belong to one branch and are validated against the caller's
organization; branch sharing remains open (BQ-20). The selector lists active
branches by default, includes inactive branches when editing an employee, and is
covered indirectly through employee component tests. Branch and employee seeding
wait on BQ-19 and real employee names respectively.

### Next action

Continue M2 with supplier master data (M2-T3). See
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
