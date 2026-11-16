# Current Task

> Last updated: 2026-11-16.
>
> **M6 sales checkpoints are IMPLEMENTED end-to-end and await authorization to
> commit.** M5 production is committed as `7441653`; M4 is `8f5f326`; M1–M3 are
> complete. The generic M6 model is implemented, but BR-013, BQ-02 and BQ-17
> still block the final WhatsApp reporting contract.

## Task identity

| Field        | Value                                                           |
| ------------ | --------------------------------------------------------------- |
| Milestone    | M6 — Sales Checkpoints                                          |
| Task ID      | M6 (all generic planned tasks)                                  |
| Task         | Checkpoints, snapshots, ledger integration, API/client/UI/tests |
| Status       | IMPLEMENTED — verification green; commit not authorized         |
| Dependencies | M1, M2 and the M4 stock ledger                                  |
| Blocks       | M7 closing and M8 sales reporting                               |

## Objective

Record aggregate sales for one branch, business date and period, snapshotting
presentation weight and effective selling price, then confirm into the M4
append-only stock ledger with audited correction.

## Completed scope

- Accepted ADR 0043 / TD-020: sales checkpoints snapshot weight and price, post
  negative `SALES_CHECKPOINT` movements and correct through one audited full
  reversal.
- Added checkpoint/item domain entities, statuses, periods, weight bases,
  creation/confirmation/correction rules and calculation helpers.
- Added `SalesCheckpointRepository` and dual-engine Drizzle implementations.
- Added `sales_checkpoint_status`, `sales_checkpoint_period` and
  `sales_checkpoint_weight_basis` enums plus the two checkpoint tables with
  period uniqueness on both engines.
- Generated and applied migrations `0011_abnormal_swordsman` (PostgreSQL) and
  `0011_motionless_turbo` (SQLite).
- Added validation schemas for create, correct, params and list.
- Added confirmation and correction use cases with price lookup, active
  master-data checks, branch isolation, stock aggregation, negative-stock
  refusal and transactional movement writes.
- Added `GET /sales-checkpoints`, `GET /sales-checkpoints/:checkpointId`,
  `POST /sales-checkpoints`, `POST /sales-checkpoints/:checkpointId/confirm`,
  `POST /sales-checkpoints/:checkpointId/correct` and
  `DELETE /sales-checkpoints/:checkpointId` behind `inventory:read` /
  `inventory:write`.
- Added typed API-client functions, React Query hooks, English/Spanish copy and
  the `/sales-checkpoints` screen with branch filter, list, detail, create,
  confirm, correct and discard flows.
- Added domain, dual-engine integration, client, component and Playwright tests.
- Added illustrative seeded checkpoints and ledger movements.
- Updated ADR/TD, workflow, database, roadmap and continuity documentation.

## Implemented constraints

- Raw lines require an active `RAW` product, positive `quantityMilli`, no tray
  fields and `salesUnitId === inventoryUnitId`; unit conversion remains BQ-10.
- Processed lines require an active `PROCESSED` product and presentation,
  positive tray count, snapshotted `averageWeightPerTrayGrams`, optional measured
  weight and inventory unit `kg`.
- The newest price effective on or before the business date is snapshotted.
  Raw lines require `PER_SALES_UNIT`; processed lines require `PER_KILOGRAM`.
- `estimatedSalesValueMinor` uses integer-safe rounding and is never recomputed.
- At least one line is required. No-sales checkpoints wait for BQ-17.
- Periods are `MORNING | EVENING` provisionally until BQ-02/BR-013 resolves
  naming and configuration.

## Out of scope

- Final WhatsApp message fields, order, mandatory fields and labels (BR-013).
- Configurable or time-derived periods (BQ-02).
- No-sales checkpoints (BQ-17).
- Unit conversion for raw products whose sales and inventory units differ
  (BQ-10).
- Individual sales, tickets, customers, payments and branch-specific prices.
- Daily closing aggregation and reporting (M7/M8).

## Acceptance criteria

- [x] Operator can select branch, business date and checkpoint period.
- [x] At least morning and evening checkpoints are supported.
- [x] Sales are aggregated by product; no individual sale records exist.
- [x] Processed lines calculate estimated kg from tray count and snapshot weight.
- [x] Raw lines use kg or unit without tray conversion.
- [x] Price and weight snapshots are stored and never recomputed.
- [x] Waste/damage is excluded from sales.
- [x] Corrections are audited.
- [x] Both engines implement the same methods; PostgreSQL cases exist and skip
      without a server (SI-06).
- [x] `/sales-checkpoints` browser coverage passes.

## Verification

- `pnpm run format:check` — PASS.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 410 passed and 13 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 15 files, 100 passed and 13 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 44 Chromium tests, including four sales-checkpoint
  specs.
- `pnpm run db:seed` — PASS on SQLite; 3 checkpoints, 6 items, 6 sales ledger
  movements and no negative balances.
- PostgreSQL integration cases were skipped because no server is available
  (SI-06), not passed.

## Next task

Authorize the M6 commit, then start M7 daily closing. Resolve BR-013 before
finalizing WhatsApp reporting fields or period names.
