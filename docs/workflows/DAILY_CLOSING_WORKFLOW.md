# Daily Closing Workflow

> Implementation status: **IMPLEMENTED in M7.** Reads `inventory:read`; create,
> review, confirm and reopen require `inventory:write`. Confirmed snapshots are
> immutable; reopening creates a new version. See ADR 0044 and TD-021.

## 1. Scope

Daily closing is the reviewed end-of-day snapshot for one branch. It consolidates
the day's purchases, production, sales checkpoints, waste, inventory differences
and remaining stock, and presents estimated revenue, cost and gross profit.

It is a **review and confirmation** workflow, not a new source of transactional
truth. The underlying records remain the evidence.

## 2. Implemented scope

M7 covers, per branch and business date:

- opening inventory;
- purchases and receiving;
- production;
- sales;
- remaining stock;
- waste and losses;
- inventory differences;
- estimated revenue;
- estimated costs;
- estimated gross profit;
- review and confirmation;
- auditable reopening and corrections (BR-023, BR-024).

## 3. Implemented model

A closing row stores organization, branch, business date, version, optional
`previousClosingId`, status, currency, source counts/totals, estimated totals,
warning counts and review/confirmation/reopening audit fields.

Statuses are `DRAFT | REVIEWED | CONFIRMED | REOPENED`. Each version is stored
separately with a unique organization/branch/date/version key. The current
closing is the highest version. A reopened confirmed row keeps its snapshot and
is marked `REOPENED`; a new `DRAFT` version points back to it.

Each product item stores:

- opening, purchased, produced, sold, waste, adjustment and correction
  quantities in integer thousandths;
- the reconciliation difference;
- closing quantity = opening + in-day movement total;
- estimated revenue from confirmed sales snapshots;
- optional unit cost and cost basis (`LATEST_PURCHASE_PRICE | UNAVAILABLE`);
- estimated cost of sales and a stable position.

Snapshot totals include purchases, production tray/weight summaries, sales,
waste record count, unreceived purchase count, production draft count,
inventory-difference product count, missing-cost product count and negative-stock
product count.

## 4. Workflow

1. Operator selects branch and business date.
2. The API computes day bounds as local midnight to the next local midnight in
   the organization timezone, then reads the branch's source records.
3. The system computes opening stock from movements before the day, the day's
   movement categories, confirmed sales revenue, purchase and production
   summaries, waste and reconciliation differences.
4. The system computes estimated cost from the latest received purchase price.
5. The operator opens the closing, reviews the summary, readiness checklist and
   item breakdown, then reviews and/or confirms it.
6. Reopening requires a reason. The confirmed version becomes `REOPENED` and a
   new draft version is created. The operator can change the underlying records
   and create another closing version.

An empty day can produce a closing; source gaps appear as warnings rather than
blocking creation.

## 5. Cost and profit rules

- **Cost basis:** latest received purchase price for the product in the same
  branch with `deliveryDate <= businessDate`, ordered by delivery date, received
  time and purchase id.
- The purchase unit must equal the closing item unit. Otherwise, or when there
  is no such purchase, the item cost basis is `UNAVAILABLE` and cost is zero.
- Cost of sales uses
  `floor((soldQuantityMilli × unitPriceMinor + 500) / 1000)`.
- Estimated revenue comes from confirmed sales-checkpoint snapshots for the
  business date, not current prices.
- Estimated gross profit = estimated revenue − estimated cost.
- Cost and gross profit are **estimates** and must be labeled as such.

BQ-14 still asks whether purchase prices are tax-inclusive and whether taxes or
freight belong in cost; M7 uses the stored unit price only.

## 6. Validation and warnings

- One current closing per branch and business date; versions preserve history.
- A duplicate create for the same branch/date is refused with HTTP 409.
- Review requires `DRAFT`; confirmation requires `DRAFT` or `REVIEWED`; reopening
  requires `CONFIRMED`.
- Reopen reasons are trimmed and must be 1–500 characters.
- Monetary totals use integer minor units in the organization currency.
- Closing quantities are exact integer thousandths; a negative closing quantity
  is flagged, not silently corrected.
- Warnings cover missing purchases, production drafts, unreceived purchases,
  waste records, inventory differences, negative stock and missing cost.
- Unit conversion is not applied (BQ-10).

## 7. UI

`/daily-closings` provides:

- branch and business-date filters;
- current closing list with status, version, revenue, cost, profit and warning
  count;
- a create action for operators with `inventory:write`;
- a detail dialog with the summary, readiness checklist and item-level
  breakdown;
- review, confirm and reopen actions with a required reason.

## 8. Tests

- Domain snapshot, cost, transition, empty-day and validation tests.
- SQLite integration tests for aggregation, costing, duplicate refusal,
  review/confirm/reopen versioning, branch isolation, persistence and errors.
- Component tests for the list, detail, review, confirmation, reopening,
  duplicate handling and required reason.
- Chromium browser tests for opening a closing and walking the review/confirm/
  reopen flow.
- PostgreSQL integration cases exist and skip when no server is available
  (SI-06).

## 9. Dependencies and open questions

Depends on M3 (purchases), M4 (inventory), M5 (production) and M6 (sales).

Resolved for M7:

- Estimated cost basis is the latest received purchase price.

Open:

1. Does the business day start/end at local midnight for every branch? M7
   assumes the organization timezone (BQ-16).
2. Are unit conversions required between purchase and inventory units? Until
   resolved, mismatches surface as `UNAVAILABLE` cost (BQ-10).
3. Are purchase prices tax-inclusive and do taxes/freight belong in cost?
   (BQ-14)
4. Which final WhatsApp reporting fields and periods are required? (BR-013,
   BQ-02)
5. Who reviews and who confirms a closing? M7 records the authenticated actor
   for both actions.
6. How should inventory differences and waste be valued for profit? M7 reports
   quantities and counts; cost of sales is based on sold quantity.
