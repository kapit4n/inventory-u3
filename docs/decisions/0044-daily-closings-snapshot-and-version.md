# ADR 0044 — Daily closings snapshot the day and reopen as a new version

## Status

Accepted — 2026-11-16. The cost basis is latest received purchase price,
confirmed for M7. BQ-16 still leaves branch business-day boundaries open, and
BQ-10 still forbids unit conversion.

## Context

M7 consolidates one branch's business day into a reviewed summary with estimated
revenue, cost and gross profit. The evidence already exists in the append-only
stock ledger, received purchases, production batches, confirmed sales
checkpoints, waste reports and physical-count reconciliations. Prices,
presentations and purchases can change later, so a confirmed closing must not be
recomputed from current master data.

The business confirmed that the estimated cost of sales uses the **latest
purchase price**. Unit conversion is not modeled (BQ-10), and the business-day
boundary is assumed to be local midnight in the organization timezone (BQ-16).

## Decision

- A closing belongs to one organization, branch and ISO business date. Each
  version is stored separately with a unique `(organizationId, branchId,
businessDate, version)` key. The current closing is the highest version.
- Statuses are `DRAFT | REVIEWED | CONFIRMED | REOPENED`. A draft can be
  reviewed or confirmed; a reviewed closing can be confirmed; only a confirmed
  closing can be reopened. Reopening requires a trimmed reason of 1–500
  characters.
- Reopening never edits the confirmed row. It marks that version `REOPENED` and
  creates a new `DRAFT` version whose `previousClosingId` points to the reopened
  row. Confirmed snapshot values are therefore preserved.
- Day bounds are local midnight to the next local midnight in the organization
  timezone. Opening quantities and categories come from stock movements with
  `occurredAt` before the day start; in-day movements drive purchasing,
  production, waste, adjustment and correction quantities. Closing quantity is
  opening plus the in-day movement total.
- Revenue comes from confirmed sales-checkpoint item snapshots for the business
  date, not from current prices. Purchases received in the day contribute their
  totals; unreceived drafts with `deliveryDate <= businessDate` are counted as a
  warning. Production batch counts, draft counts, tray counts and estimated
  output weight come from batches on the date. Waste record count and
  reconciliation differences are counted from their own rows.
- Item cost uses the latest received purchase line for the product in the same
  branch with `deliveryDate <= businessDate`, ordered by delivery date,
  received time and purchase id. The purchase unit must equal the closing item
  unit. Cost of sales is
  `floor((soldQuantityMilli × unitPriceMinor + 500) / 1000)`.
- When a sold product has no same-unit received purchase, its cost basis is
  `UNAVAILABLE`, its cost is `0`, and the closing increments
  `missingCostProductCount`. The closing is still creatable so the operator can
  see the gap.
- Totals are snapshot integers in the organization currency. `estimatedRevenue`
  equals the sales snapshot total, and `estimatedGrossProfit` equals revenue
  minus cost. Negative closing stock and missing cost are warnings, not creation
  blockers.
- Closing items are ordered by product id and carry an immutable position.
  Reads use `inventory:read`; creation, review, confirmation and reopening use
  `inventory:write`.

## Alternatives considered

- **Mutate the confirmed closing when reopened.** Rejected: it would rewrite the
  reviewed evidence and erase the audit trail.
- **Recompute a confirmed closing from current records.** Rejected: later price,
  purchase, presentation or stock changes would rewrite history.
- **Block creation when any source is missing or stock is negative.** Rejected
  for M7: the operator needs a reviewed snapshot that exposes the gaps. A
  readiness checklist is more useful than an all-or-nothing gate.
- **Use weighted-average, FIFO or manual cost.** Rejected: the business
  confirmed latest purchase price for this milestone.
- **Convert purchase and item units during costing.** Rejected while BQ-10 is
  unresolved; a mismatched unit is reported as missing cost instead of assuming
  a conversion.
- **Store only totals without product lines.** Rejected: the summary could not
  show which products lack cost or drive the inventory differences.

## Consequences

- Confirmed closings are immutable except for the `REOPENED` status transition;
  corrections happen in the next version.
- Cost and gross profit are estimates and must remain labeled as such in the UI
  and later reports.
- Missing purchases or mismatched units surface as `UNAVAILABLE` cost rather than
  a guessed value.
- Branch timezones and non-midnight business-day boundaries require a future
  decision; the current implementation uses the organization timezone.
- The closing reads several existing bounded areas and stores its own snapshot
  tables on both engines; no transactional source record is replaced.
