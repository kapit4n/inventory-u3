# Inventory U3 — Implementation Progress

> This is the main progress document. Update it at the end of every session.
> Do not mark a task complete unless the repository and its tests prove it.

## Summary

| Field                  | Value                                                                             |
| ---------------------- | --------------------------------------------------------------------------------- |
| Current milestone      | M1 — Business Domain Foundation                                                   |
| Current task           | M1-T4 complete; next task is M1-T5 (access model note)                            |
| Overall project status | Foundation, branch, catalog, measurement and stock concepts complete; no stock UI |
| Completed milestones   | None of M1–M9 (the foundation prerequisite is complete)                           |
| In-progress milestones | M1                                                                                |
| Blocked milestones     | M6 finalization is blocked on BR-013 (WhatsApp reporting format)                  |
| Pending milestones     | M2, M3, M4, M5, M6, M7, M8, M9                                                    |
| Last verified commit   | `afc1cee` (M1-T4 stock movement concepts)                                         |
| Last update date       | 2026-11-09                                                                        |
| Next recommended task  | M1-T5 — Access model note: central operator now, branch users later               |

### Working tree at the time of this update

M1-T4 added the append-only stock movement vocabulary, correction invariants and
a balance read-model type without adding a table, port or API. These changes are
committed as `afc1cee`. M1-T1 is committed as `d6b62d5`; M1-T2 as `10f882d`;
M1-T3 as `4168462`.

## Verification for this update

| Command                            | Result                                                         |
| ---------------------------------- | -------------------------------------------------------------- |
| `pnpm run typecheck`               | PASS — 12/12 tasks                                             |
| `pnpm run lint`                    | PASS — 12/12 tasks, `BOUNDARY GUARD OK`                        |
| `pnpm run guard:boundaries`        | PASS — `BOUNDARY GUARD OK`                                     |
| `pnpm exec turbo run test --force` | PASS — 12/12 tasks, 166 passed, 3 skipped                      |
| `pnpm run test:integration`        | PASS with `TEST_DATABASE_URL=` — 4 files, 22 passed, 3 skipped |
| `pnpm run db:migrate`              | NOT NEEDED — M1-T4 adds no schema change                       |
| `pnpm run db:seed`                 | NOT NEEDED — M1-T4 adds no persisted data                      |
| `pnpm run test:e2e`                | NOT RUN; last recorded result was 18/18 on the foundation      |
| `pnpm run format:check`            | PASS — all files use Prettier style                            |
| Local Markdown link check          | PASS — all local links resolve                                 |
| `pnpm run build`                   | PASS — 5/5 tasks                                               |

Test counts from the forced run: API 48 passed + 3 skipped, desktop 4, database
6, api-client 15, app 48, domain 45. Total 166 passed and 3 skipped. The domain
suite includes 17 stock-movement tests. The skipped tests are the PostgreSQL
branch and catalog repository tests, which require a reachable
`TEST_DATABASE_URL`.

PostgreSQL integration tests were not executed because no PostgreSQL server is
available on this machine. This is a known environment limitation, not a pass.
The default `pnpm run test:integration` fails here because `.env` supplies a
`TEST_DATABASE_URL` pointing at the absent server; run it as
`TEST_DATABASE_URL= pnpm run test:integration` to exercise the SQLite
integration files without the PostgreSQL half. See SI-06.

---

## M1 — Business Domain Foundation

**Status: IN_PROGRESS**

### Completed

- [x] Repository architecture, packages, persistence and guardrails inspected.
- [x] Existing implemented domain documented: organization, user, session, role,
      permission, organization settings, branch, product catalog and stock
      concepts.
- [x] Actual database tables documented: organizations, branches, catalog,
      users and sessions.
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

### In Progress

None. M1-T4 is complete; M1-T5 is not started.

### Pending

- [ ] M1-T5: Access model note for the central operator and future branch users.
- [ ] M1-T6: Update technical docs and boundary guard for the remaining domain.
- [ ] Branch API route and management UI (M2).
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
- No schema change, migration, seed or database test was required for M1-T4.
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
- Branch-scoped persistence is recorded in
  [ADR 0039](../decisions/0039-branch-scoped-persistence.md).

### Known limitations

- `Branch` and the catalog have no API routes or UI yet; they are
  domain/persistence slices.
- Products have a kind and presentations have a configured average weight, but
  prices, estimated/measured weights and snapshots do not exist.
- Stock exists as a domain vocabulary only; there is no stock table, repository,
  API, balance calculation or inventory screen.
- No supplier, purchase, production, sales or closing entity exists.
- The only business-looking UI is a static inventory placeholder.
- The three development branches are not seeded because their names are not confirmed.
- The existing roles are foundation roles, not the owner/operator/branch model.
- `data/` is git-ignored; a fresh clone must run migrations and seed.

### Next action

Implement **M1-T5**: document the access model for the central operator now and
future branch users later, without building branch authorization. See
[CURRENT_TASK.md](./CURRENT_TASK.md).

---

## M2 — Master Data

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Branch management UI/API.
- [ ] Employee master data.
- [ ] Supplier master data.
- [ ] Product categories.
- [ ] Products (raw and processed).
- [ ] Measurement units.
- [ ] Product presentations.
- [ ] Average weight per tray configuration.
- [ ] Selling prices and price history.
- [ ] Raw-to-finished product relationship rules.

### Validation

No implementation and no tests.

### Notes

Depends on M1. See roadmap acceptance criteria.

### Next action

Start after M1 acceptance criteria are verified.

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
