# Daily Closing Workflow

> Implementation status: **NOT_IMPLEMENTED.** No closing table exists. This is the
> design target for M7.

## 1. Scope

Daily closing is the reviewed end-of-day snapshot for one branch. It consolidates
the day's purchases, production, sales checkpoints, waste and remaining stock,
and presents estimated revenue, cost and gross profit.

It is a **review and confirmation** workflow, not a new source of transactional
truth. The underlying records remain the evidence.

## 2. Confirmed scope

M7 must cover, per branch and business date:

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

## 3. Proposed model

```text
DailyClosing
  id
  organizationId
  branchId
  businessDate
  status                (OPEN | REVIEWED | CONFIRMED | REOPENED)
  openedInventory       (snapshot / computed references)
  purchasesTotal        (minor units, snapshot)
  productionSummary     (trays and estimated kg, snapshot)
  salesTotal            (minor units, snapshot)
  remainingStock        (snapshot)
  wasteTotal            (snapshot)
  inventoryDifference   (snapshot)
  estimatedRevenue      (minor units)
  estimatedCost         (minor units)
  estimatedGrossProfit  (minor units)
  reviewedByUserId
  confirmedByUserId
  confirmedAt
  reopenedAt / reopenReason
```

The exact columns are **PROPOSED**. Snapshotting is important: a confirmed
closing must not silently change when a product price or a prior record is edited.

## 4. Proposed workflow

1. Operator selects branch and business date.
2. The system gathers the day's confirmed purchases, production and sales
   checkpoints, plus unresolved drafts and warnings.
3. The system computes opening stock, remaining stock, waste and differences.
4. The system computes estimated revenue from sales snapshots.
5. The system computes estimated cost from a defined cost basis (PENDING).
6. The system computes estimated gross profit = revenue − cost.
7. The operator reviews warnings (missing checkpoints, negative stock, unreceived
   purchases, unconfirmed production).
8. The operator confirms the closing; the snapshot is stored with actor/time.
9. Reopening requires a reason and is audited. A reopened closing must not erase
   the previous confirmed values.

## 5. Cost and profit rules

Estimated revenue can be computed from sales snapshots. Estimated cost is more
fragile and needs a confirmed basis. Candidate bases (none accepted yet):

- latest purchase price per product;
- weighted-average purchase price for a period;
- FIFO consumption;
- a manually entered cost.

Do not encode a cost method until the business confirms one. The gross profit is
an **estimate** and must be labeled as such.

## 6. Validation rules (proposed)

- One closing per branch and business date, unless reopened with audit history.
- A closing cannot be confirmed while required daily records are missing, unless
  an explicit override with reason is recorded.
- Currency must match the organization/price context.
- Monetary totals use integer minor units.
- Estimated and measured values are not mixed silently.
- Reopening and correction must preserve the previous snapshot.

## 7. UI expectations (M7)

- Branch + business date selector.
- Readiness checklist: purchases, production, checkpoints, waste.
- Summary cards for revenue, cost and estimated gross profit.
- Drill-down from each summary to the underlying records.
- Warnings for inventory differences and missing data.
- Confirm and reopen actions with reasons.

## 8. Tests required

- Aggregation tests for mixed days (raw + processed, multiple checkpoints).
- Snapshot tests: changing master data after confirmation does not alter closing.
- State transition tests for open → reviewed → confirmed → reopened.
- Branch isolation and date-boundary tests using the organization timezone.
- Cost-basis tests once the method is confirmed.
- Repository and integration tests on both engines.
- Browser test for the review and confirm flow.

## 9. Dependencies and open questions

Depends on M3 (purchases), M4 (inventory), M5 (production) and M6 (sales).

Open:

1. What is the estimated cost basis? (latest, weighted average, FIFO, manual)
2. Who reviews and who confirms a closing?
3. What time does a business day start and end in each branch?
4. Are missing checkpoints a block or a warning?
5. Can a closing be confirmed before all three branches are entered?
6. Is opening inventory carried from the previous closing or from stock movements?
7. How are inventory differences valued for profit?
8. Are losses/waste valued at cost or at sale price for reporting?
