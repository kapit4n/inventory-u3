# Current Task

> Last updated: 2026-11-16.
>
> **M7 daily closing is COMPLETE and verified; pending commit.** M6 sales
> checkpoints are committed as `52e39a3`, M5 production as `7441653`, M4 as
> `8f5f326` and M1–M3 are complete. BR-013, BQ-16, BQ-10, BQ-02 and BQ-17 still
> limit later reporting and period work.

## Task identity

| Field        | Value                                                 |
| ------------ | ----------------------------------------------------- |
| Milestone    | M7 — Daily Closing                                    |
| Task ID      | M7 (all planned tasks)                                |
| Task         | Versioned snapshots, costing, API/client/UI and tests |
| Status       | COMPLETE — verified; pending commit authorization     |
| Dependencies | M3, M4, M5 and M6                                     |
| Blocks       | M8 consolidated reporting                             |

## Objective

Produce a reviewed daily summary per branch with estimated revenue, cost and
gross profit, with audited reopening.

## Completed scope

- Accepted ADR 0044 / TD-021: daily closings snapshot the day and reopen as a new
  version.
- Confirmed the M7 cost basis as the latest received purchase price.
- Added daily-closing domain entities, version/status transitions, snapshot item
  building, latest-purchase costing and missing-cost/negative-stock warnings.
- Added `DailyClosingRepository` and dual-engine Drizzle implementations.
- Added `daily_closings` and `daily_closing_items` with status/cost-basis enums,
  unique organization/branch/date/version and product item keys on both engines.
- Generated migrations `0012` for PostgreSQL and SQLite; applied SQLite locally.
- Added application use cases for create, review, confirm, reopen and source
  snapshot aggregation.
- Added `GET /daily-closings`, `GET /daily-closings/:dailyClosingId`, `POST`,
  `POST /:id/review`, `POST /:id/confirm` and `POST /:id/reopen` behind
  `inventory:read` / `inventory:write`.
- Added validation schemas, typed API-client functions, React Query hooks,
  English/Spanish copy and the `/daily-closings` page with branch/date filters,
  create dialog, summary/readiness/item detail and review/confirm/reopen actions.
- Added domain, SQLite integration, component and Chromium browser tests.
- Updated ADR/TD, workflow, database, roadmap and continuity documentation.

## Implemented constraints

- A closing belongs to one branch and business date. Versions are separate rows;
  the current closing is the highest version.
- Statuses are `DRAFT | REVIEWED | CONFIRMED | REOPENED`. Review requires
  `DRAFT`; confirmation requires `DRAFT` or `REVIEWED`; reopening requires
  `CONFIRMED` and a trimmed 1–500 character reason.
- Reopening marks the confirmed row `REOPENED` and creates a new `DRAFT` version
  linked by `previousClosingId`; snapshot values are never edited.
- Business-day bounds are local midnight in the organization timezone until
  BQ-16 is confirmed.
- Opening and movement quantities come from the append-only stock ledger.
  Revenue comes from confirmed sales-checkpoint snapshots, not current prices.
- Cost uses the latest received purchase for the product in the branch with
  `deliveryDate <= businessDate`, ordered by delivery date, received time and
  purchase id, only when the purchase unit equals the item unit.
- Missing same-unit cost is `UNAVAILABLE` with zero cost and a
  `missingCostProductCount` warning. Unit conversion is not applied (BQ-10).
- Estimated cost of sales uses integer-safe half-up rounding; gross profit is
  revenue minus cost.
- Missing sources, negative closing stock, unreceived purchases, production
  drafts, waste and inventory differences are warnings, not creation blockers.
- An empty day can produce a closing.

## Out of scope

- Final WhatsApp message fields, order, mandatory fields and labels (BR-013).
- Configurable or time-derived periods (BQ-02).
- Unit conversion (BQ-10).
- Branch timezones or non-midnight business days (BQ-16).
- Consolidated dashboards, multi-day reports and exports (M8).
- Record-level drill-down links from the closing; the detail dialog shows the
  per-product breakdown and warnings.

## Acceptance criteria

- [x] Operator can select branch and business date and create a closing.
- [x] Opening, purchasing, production, sales, waste, differences and closing
      stock are represented.
- [x] Revenue uses confirmed sales snapshots.
- [x] Cost uses the confirmed latest-purchase-price basis and is labeled
      estimated.
- [x] Gross profit is calculated and labeled estimated.
- [x] Confirm freezes the snapshot; reopening preserves it as a new version.
- [x] Inventory differences, missing sources, negative stock and missing cost
      are visible.
- [x] Both engines implement the same methods; PostgreSQL cases exist and skip
      without a server (SI-06).
- [x] `/daily-closings` browser coverage passes.

## Verification

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
- `pnpm run db:seed` — PASS on SQLite; 10 sales checkpoints, 24 lines, 57 ledger
  rows and no negative balances. The seed has no purchases, so a seeded closing
  reports missing cost until purchase fixtures are added.
- PostgreSQL integration cases were skipped because no server is available
  (SI-06), not passed.

## Next task

Commit M7 when authorized, then start M8 consolidated reporting. Resolve BR-013,
BQ-16, BQ-10, BQ-02 and BQ-17 before treating periods, cost or WhatsApp reporting
as final.
