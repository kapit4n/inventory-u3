# Current Task

> Last updated: 2026-11-15.
>
> **M5 production is COMPLETE in the working tree and pending commit.** M4 is
> committed as `8f5f326`; M1–M3 are also complete.

## Task identity

| Field        | Value                                                           |
| ------------ | --------------------------------------------------------------- |
| Milestone    | M5 — Production                                                 |
| Task ID      | M5 (all planned tasks)                                          |
| Task         | Batches, snapshots, ledger integration, API/client/UI and tests |
| Status       | COMPLETE in the working tree — pending commit                   |
| Dependencies | M1, M2 and the M4 stock ledger                                  |
| Blocks       | M6 sales checkpoints and M7 closing                             |

## Objective

Record each branch's tray production with the physical preparer, registering
operator, tray count, presentation, average-weight snapshot, optional measured
weight, optional raw consumption and explicit waste, writing all stock changes
to the M4 append-only ledger.

## Completed scope

- Accepted ADR 0042 / TD-019: production snapshots tray weight, posts one net
  movement per product and corrects through a single audited full reversal.
- Added production batch/input/output/waste domain entities, statuses, weight
  bases and creation/confirmation/correction factories.
- Added `ProductionBatchRepository` and dual-engine Drizzle implementations.
- Added `production_status`/`production_weight_basis` enums and production tables
  for PostgreSQL and SQLite, with migrations `0010` and indexes.
- Added validation schemas for create, confirm, correct and list.
- Added confirmation and correction use cases with active master-data checks,
  branch isolation, stock aggregation, negative-stock refusal and transactional
  movement writes.
- Added `GET /production`, `GET /production/:batchId`, `POST /production`,
  `POST /production/:batchId/confirm`, `POST /production/:batchId/correct` and
  `DELETE /production/:batchId` behind `inventory:read`/`inventory:write`.
- Added typed API-client functions, React Query hooks and English/Spanish copy.
- Implemented `/production` with branch selector, batch table, detail, create,
  confirm, correct and discard flows, empty/error states and permissions.
- Added domain, dual-engine integration, client, component and Playwright tests.
- Updated ADR/TD, workflow, roadmap, progress and continuity documentation.

## Out of scope

- Recipes or a bill of materials (BQ-11 keeps inputs free-form).
- Partial production corrections, draft editing and production price valuation.
- Sales checkpoint movements and tray-to-kilogram sales calculations (M6).
- Daily closing and reporting aggregation (M7/M8).

## Acceptance criteria

- [x] A confirmed batch records branch, business date, preparer and operator.
- [x] Output records product, presentation and tray count.
- [x] Average weight per tray is snapshotted and estimated weight is calculated.
- [x] Changing product configuration later does not alter the batch.
- [x] Raw consumption is recorded when reported and absent otherwise.
- [x] Waste/losses are separate lines and affect stock.
- [x] Confirmed batches are corrected through an audited path.
- [x] Confirmation refuses any product whose resulting stock would be negative.
- [x] Both engines implement the same production methods; PostgreSQL cases
      exist and skip without a server (SI-06).
- [x] `/production` browser coverage passes.

## Verification

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

## Next task

Commit M5 after explicit authorization. Then start M6 sales checkpoints only
after BR-013 is resolved.
