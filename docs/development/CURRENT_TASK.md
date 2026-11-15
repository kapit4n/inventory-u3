# Current Task

> Last updated: 2026-11-15.
>
> **M4 is COMPLETE and awaiting commit. M1, M2 and M3 are complete and committed
> (`cc70bfc` and `13b8fcd`).** M5 production is the next milestone.

## Task identity

| Field        | Value                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| Milestone    | M4 — Branch Inventory                                                               |
| Task ID      | M4 (all planned tasks)                                                              |
| Task         | Derived stock balances, adjustments, waste, reconciliation, API/client/UI and tests |
| Status       | COMPLETED — not yet committed                                                       |
| Dependencies | M1, M2 and the stock effects of M3                                                  |
| Blocks       | M5 production, M6 sales checkpoints and M7 closing                                  |

## Objective

Give every branch an independent, auditable inventory of raw and finished stock
derived from the append-only movement ledger, with explicit adjustments, waste
and physical-count reconciliation.

## Completed scope

- Accepted ADR 0041 / TD-018: balances are derived from movements, quantities are
  exact integer thousandths, negative stock is refused, and there is no balance
  cache table.
- Stock movement quantities migrated from decimals to
  `quantity_delta_milli` on both engines, including conversion of existing rows
  in migration `0009`.
- Added `StockAdjustment` and `InventoryWaste` domain entities with signed
  adjustment deltas, positive waste quantities, required reasons, optional notes
  and actor/time audit fields.
- Added `assertStockDoesNotGoNegative` and the `INSUFFICIENT_STOCK` domain error.
- Extended movement repositories with product timelines, per-product balances and
  branch balance aggregation; added stock-adjustment and inventory-waste
  repositories for PostgreSQL and SQLite.
- Added adjustment, waste and reconciliation use cases with active
  branch/product/unit validation, branch isolation and transactional movement
  writes.
- Reconciliation stores expected and counted quantities and records a movement
  only when the difference is non-zero.
- Purchase receiving and correction now use integer thousandths and refuse a
  correction that would leave negative stock.
- Added `GET /inventory`, `GET /inventory/:productId/movements`,
  `POST /inventory/adjustments`, `POST /inventory/waste` and
  `POST /inventory/reconciliations` behind `inventory:read`/`inventory:write`.
- Added inventory validation schemas, typed REST-client functions and typed
  responses.
- Replaced the `/inventory` placeholder with the branch-aware stock table,
  movement history, adjustment, waste and reconciliation dialogs, empty states,
  permissions and English/Spanish copy.
- Added domain, dual-engine integration, REST-client, component and Playwright
  coverage.
- Updated the project, workflow, database, roadmap, progress, decision and
  continuity documentation.

## Out of scope

- Cached balances and materialized projections; M4 derives from the ledger.
- Negative-stock overrides or approval workflows.
- Transfers between branches.
- Production input/output movements (M5).
- Sales checkpoint movements and tray-to-kilogram sales calculations (M6).
- Daily closing and reporting aggregation (M7/M8).

## Acceptance criteria

- [x] Stock is independent per branch and cannot leak between branches.
- [x] Every stock change is traceable to a movement, reason and actor.
- [x] Adjustments and waste are distinct from sales.
- [x] A reconciliation produces an auditable adjustment.
- [x] Negative stock is refused; no override exists.
- [x] Raw and finished products use their configured inventory units.
- [x] Both engines implement the same inventory methods; PostgreSQL tests exist
      and skip without a server.
- [x] `/inventory` browser coverage passes.

## Verification

All commands were re-run after the final Prettier pass.

- `pnpm run format:check` — PASS.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 361 passed and 13 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 13 files, 82 passed and 13 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 36 Chromium tests, including four inventory tests.
- `pnpm run db:migrate` — PASS, SQLite migrations applied through `0009`.
- Migration `0009` was validated against the existing local database: 8
  movements converted to 6 `RECEIVING` totaling `118500` and 2 `CORRECTION`
  totaling `-45000`, with a net balance of `73500`; both new tables and the new
  branch/product index exist.

PostgreSQL integration tests were not executed because no PostgreSQL server is
available on this machine. See SI-06.

## Next task

Commit M4 when authorized, then start M5 production: branch batches with
preparer/operator, tray counts, average-weight snapshots, optional raw inputs,
finished outputs and waste, all writing to the M4 ledger.
