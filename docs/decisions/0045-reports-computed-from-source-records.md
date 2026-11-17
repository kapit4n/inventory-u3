# ADR 0045 — Reports are computed on demand from source records

## Status

Accepted — 2026-11-17. The report contract is implemented for M8. BR-013,
BQ-02, BQ-10, BQ-14, BQ-16 and BQ-17 remain open and limit the final meaning of
WhatsApp fields, configurable periods, unit conversion, tax/freight treatment,
business-day boundaries and no-sales reporting.

## Context

M8 gives the owner a consolidated view of all branches and detail reports for
sales, purchases, production, stock, waste and estimated profitability. The
required evidence already exists in confirmed sales checkpoints, received
purchases, confirmed production batches, the append-only stock ledger, waste
records and daily closings. The application also needs daily, weekly and monthly
periods plus a CSV export that works on web and desktop without exposing the
database to React.

Confirmed closings are immutable and already provide daily snapshots, but they
are per branch, per business date and versioned. A report may cover a range and
aggregate across branches, and it must still reflect source rows that are not
part of a closing. Storing another report snapshot would add a second source of
truth before a product requirement demands one.

## Decision

- The domain exposes one `ReportRepository.readSources(...)` port and a pure
  `buildReport(...)` function. SQLite and PostgreSQL implement the same port;
  there is no third database abstraction.
- `GET /api/v1/reports/summary` accepts required ISO `from` and `to` dates, an
  optional `branchId` and `granularity` of `day | week | month` (default `day`).
  The route requires `reports:read`; `ADMINISTRATOR` and `MANAGER` have it,
  `STAFF` does not. Malformed input returns HTTP 422.
- Sales come from `CONFIRMED` sales checkpoints. Production comes from
  `CONFIRMED` batches. Purchases come from `RECEIVED` purchases. Inventory comes
  from stock movements up to the end of `to`. Waste combines inventory waste and
  production waste with their source labels.
- Periods use the organization timezone. Day periods use the exact date, weeks
  start on Monday and months start on the first day. Waste is assigned to a
  period from the local date of `occurredAt`.
- Cost and profit are estimated with the M7 BQ-04 rule: latest received purchase
  price for the product in the branch with `deliveryDate <= sale businessDate`,
  ordered by delivery date, received time and purchase id. The unit must match
  or cost is zero and a missing-cost counter is incremented. No unit conversion
  is applied while BQ-10 is open.
- Waste occurrence time is bounded by the report's lower and upper day bounds;
  closing stock is the balance of all movements before the end of `to`.
- The dashboard defaults to the last seven days inclusive, all branches and day
  granularity. Filters and granularity change the query through TanStack Query;
  no report data is cached in a global store.
- CSV is generated in the app from the report response and saved through
  `usePlatform().saveFile`. React never accesses a database or API internals.
- No new report tables, views or migration are introduced. Existing source
  tables and indexes are read directly.

## Alternatives considered

- **Materialized report tables or a report snapshot per period.** Rejected:
  another persisted source of truth is premature and would need dual-engine
  schema, migrations and refresh semantics before a confirmed requirement.
- **Exclusively reuse daily-closing snapshots.** Rejected: closings are branch
  scoped and daily, while reports must aggregate arbitrary ranges and include
  source rows that can exist outside a closing.
- **Server-generated CSV download.** Rejected for M8: the platform abstraction
  already supports saving generated content on web and desktop, and a new binary
  transport would bypass that boundary.
- **Fixed `/100` currency formatting in CSV.** Rejected: minor-unit scale is
  currency-specific. CSV money formatting now uses the captured currency's
  fraction digits.
- **Apply unit conversion to mismatched units.** Rejected while BQ-10 is
  unresolved; the report counts the cost as unavailable instead of guessing.

## Consequences

- Reports always reflect current source rows, including later corrections to
  drafts or source records; confirmed daily closings remain the immutable daily
  business snapshot.
- Cost and gross profit are labeled estimated. Missing same-unit cost is visible
  as a count rather than hidden.
- Range reports read several operational bounded areas; query performance needs
  measuring in M9 before adding report-specific indexes or materialization.
- The CSV file is a plain localized detail export, not an accounting document.
- Final WhatsApp and period semantics remain pending business confirmation.

## References

- [ADR 0044 — Daily closings snapshot the day and reopen as a new version](./0044-daily-closings-snapshot-and-version.md)
- [TD-021 — Daily closings snapshot the day and reopen as a new version](../project/TECHNICAL_DECISIONS.md#td-021--daily-closings-snapshot-the-day-and-reopen-as-a-new-version)
