# Current Task

> Last updated: 2026-11-17.
>
> **M8 dashboard and reports is COMPLETE and verified; pending commit.** M7 daily
> closing is committed as `e04bafa`, M6 as `52e39a3`, M5 as `7441653`, M4 as
> `8f5f326` and M1–M3 are complete. BR-013, BQ-02, BQ-10, BQ-14, BQ-16 and BQ-17
> still limit final reporting semantics.

## Task identity

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| Milestone    | M8 — Dashboard and Reports                                   |
| Task ID      | M8 (all planned tasks)                                       |
| Task         | Consolidated reporting, periods, estimated profit and export |
| Status       | COMPLETE — verified; pending commit authorization            |
| Dependencies | M3, M4, M5, M6 and M7                                        |
| Blocks       | M9 quality, permissions and operational hardening            |

## Objective

Give the owner a consolidated view across all three branches and the detail
reports needed to run the business, with day/week/month periods and a usable CSV
export that does not give React database access.

## Completed scope

- Accepted ADR 0045 / TD-022: reports are computed on demand from source records.
- Added a pure domain report builder with totals, section rows, branch filters,
  period grouping and capped detail rows.
- Added `ReportRepository.readSources(...)` with SQLite and PostgreSQL
  implementations and registrations.
- Added a report use case, Zod schemas and `GET /api/v1/reports/summary` behind
  `reports:read`; malformed queries return HTTP 422.
- Added a typed API client, React Query hook and `/dashboard` page with date,
  branch and granularity filters.
- Added sales-by-branch/product, purchase/supplier, production, inventory, waste
  and estimated-profit sections.
- Reused the M7 latest-purchase cost rule with a same-unit guard and
  missing-cost count; profit remains labeled estimated.
- Grouped periods in the organization timezone; weeks start Monday and months
  start on day one.
- Added localized EN/ES copy, empty states, error states and CSV export through
  `usePlatform().saveFile`.
- Added domain, SQLite integration, component and Chromium browser tests.
- Updated ADR/TD, roadmap and continuity documentation.

## Implemented constraints

- `from` and `to` are required ISO dates; `branchId` is optional and
  `granularity` defaults to `day`.
- Sales come from confirmed checkpoints, production from confirmed batches and
  purchases from received purchases.
- Inventory is the ledger balance before the end of `to`; waste combines
  inventory waste and production waste with their source labels.
- Waste is bounded by the report's lower and upper day bounds; period assignment
  uses the organization timezone and the local date of `occurredAt`.
- Estimated cost uses the latest received purchase with
  `deliveryDate <= sale businessDate`, ordered by delivery date, received time
  and purchase id. A unit mismatch yields zero cost and increments the
  missing-cost count.
- No report tables, views or migrations were added.
- CSV money formatting uses the captured currency's fraction digits, not a
  hardcoded `/100` assumption.

## Out of scope

- Final WhatsApp fields, order, mandatory fields and labels (BR-013).
- Configurable or time-derived checkpoint/report periods (BQ-02).
- Unit conversion between purchase, inventory, production and sales units
  (BQ-10).
- Tax/freight treatment in cost (BQ-14).
- Branch timezones or non-midnight business days (BQ-16).
- A no-sales checkpoint or reporting marker (BQ-17).
- Report-specific indexes, materialization or performance targets; measure in M9.
- Record-level drill-down links from report rows.

## Acceptance criteria

- [x] Owner can view consolidated totals across branches.
- [x] Owner can filter to one branch.
- [x] Sales by branch and product match checkpoint data.
- [x] Purchase/supplier and production reports match source records.
- [x] Estimated kilograms and revenue are labeled estimated.
- [x] Waste/damage is distinguishable from sales.
- [x] Daily/weekly/monthly periods use the organization timezone.
- [x] Export produces a usable file without giving the UI database access.

## Verification

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

## Next task

Commit M8, then start M9 quality, permissions and operational hardening. Resolve
BR-013, BQ-02, BQ-10, BQ-14, BQ-16 and BQ-17 before treating final reporting
semantics as confirmed.
