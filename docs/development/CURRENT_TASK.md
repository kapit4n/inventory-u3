# Current Task

> Last updated: 2026-11-13.
>
> **M3 is COMPLETE and verified in the working tree. M2 remains complete and
> committed as `cc70bfc`.** The M3 closeout changes are not yet committed.

## Task identity

| Field        | Value                                                                                   |
| ------------ | --------------------------------------------------------------------------------------- |
| Milestone    | M3 — Supplier Purchases and Receiving                                                   |
| Task ID      | M3 (all planned tasks)                                                                  |
| Task         | Purchase registration, one-shot receiving, audited corrections, API/client/UI and tests |
| Status       | COMPLETED (working tree; pending commit)                                                |
| Dependencies | M1 and M2 complete                                                                      |
| Blocks       | M4 branch inventory                                                                     |

## Objective

Let the operator register supplier deliveries per branch, change stock only on
confirmed receiving, preserve purchase prices, and reverse a received purchase
through an auditable correction.

## Completed scope

- Purchase, purchase-item and purchase-correction domain entities, statuses and
  rules, including integer-thousandth quantities and minor-unit totals.
- Dual-engine schema and migrations `0007` and `0008`: `purchases`,
  `purchase_items`, `purchase_corrections` and append-only `stock_movements`,
  plus the `PURCHASE_CORRECTION` source type and unique correction key.
- PostgreSQL and SQLite repositories for purchases, corrections and stock
  movements.
- Receiving use case: transactional one-shot `DRAFT -> RECEIVED`, one
  `RECEIVING` movement per line, exactly once.
- Correction use case: audited full reversal with reason and before/after totals,
  one compensating `CORRECTION` movement per receipt movement.
- Validation schemas, authenticated routes (`inventory:read`/`inventory:write`),
  problem mapping and typed REST client.
- `/purchases` list, multi-line form, receive/cancel actions, correction dialog,
  navigation entry and English/Spanish copy.
- Domain, dual-engine repository, route, REST-client, component and Playwright
  purchase tests.

## Out of scope

- Partial receiving (BQ-15).
- Taxes and freight (BQ-14).
- Unit conversion between purchase and inventory units (BQ-10).
- Shared supplier deliveries across branches (BQ-13).
- Balance calculation, adjustments, waste and reconciliation: M4.
- Supplier payment, invoice and accounts-payable records (BQ-21).

## Acceptance criteria

- [x] Operator can register a purchase with multiple lines for one branch.
- [x] A draft purchase does not change stock.
- [x] Confirming receiving creates stock movements and cannot run twice.
- [x] Purchase line prices are preserved for history.
- [x] A received purchase cannot be silently edited or deleted.
- [x] Correction path records actor, reason and before/after evidence.
- [x] Both engines implement the same purchase/receiving methods; PostgreSQL
      tests exist and skip without a server.
- [x] Branch and organization isolation are enforced and tested.
- [x] `/purchases` browser coverage passes.

## Verification

All commands were re-run after the final Prettier pass.

- `pnpm run format:check` — PASS.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 335 passed and 12 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 12 files, 77 passed and 12 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 32 Chromium tests.
- `pnpm run db:migrate` — PASS, SQLite migrations applied through `0008`.

PostgreSQL integration tests were not executed because no PostgreSQL server is
available on this machine. See SI-06.

## Next task

Start M4 branch inventory. Read the M4 roadmap section and BQ-07/BQ-08 first.
Build the movement ledger/balance decision on top of the persisted M3 movements;
do not add production, sales, closing or reporting work.
