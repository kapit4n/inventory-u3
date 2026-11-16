# Sales Checkpoint Workflow

> Implementation status: **IMPLEMENTED WITH PROVISIONAL REPORTING FIELDS.**
> PostgreSQL and SQLite tables, migrations, API, client and `/sales-checkpoints`
> UI exist as of M6.
>
> **Important:** the exact information employees report through WhatsApp is not
> confirmed (BR-013), and period naming/configuration remains open (BQ-02). The
> implemented model is deliberately generic; do not treat these fields or the
> `MORNING | EVENING` names as the final reporting contract.

## 1. Scope

A sales checkpoint is an **aggregate** sales report for one branch, one business
date and one checkpoint period. It records how much of each product was sold. It
does not record individual customers, tickets or payments (BR-009).

Expected periods are approximately 12:00 and 20:00 (BR-011), but whether these
are fixed, configurable or only typical is **PENDING**.

## 2. Confirmed rules

1. The central operator selects a branch and business date.
2. There are at least two expected daily checkpoints (morning/noon and evening).
3. Sales are aggregated by product.
4. Processed products may be measured in trays and converted to estimated
   kilograms.
5. Unprocessed products use kilograms or units as configured.
6. Historical weight and price snapshots are preserved.
7. Sales are distinct from damaged/discarded products.
8. Corrections require audit history.

## 3. Implemented model

```text
SalesCheckpoint
  id
  organizationId
  branchId
  businessDate
  period                (MORNING | EVENING; naming pending)
  status                (DRAFT | CONFIRMED | CORRECTED)
  registeredByUserId
  note
  confirmedByUserId / confirmedAt
  correctedByUserId / correctedAt / correctionReason

SalesCheckpointItem
  checkpointId
  productId
  productKind           (RAW | PROCESSED snapshot)
  unitId                (snapshot of the inventory unit)
  quantityMilli         (exact integer thousandths)
  presentationId        (processed only)
  trayCount             (processed only)
  averageWeightPerTrayGrams (processed snapshot)
  estimatedWeightGrams  (processed snapshot)
  measuredWeightGrams   (processed optional)
  weightBasis           (ESTIMATED | MEASURED | NOT_APPLICABLE)
  sellingPriceAmountMinor / sellingPriceBasis / sellingPriceCurrency
  estimatedSalesValueMinor (rounding as specified below)
```

The implemented names are fixed in migration `0011`; reporting labels and
mandatory WhatsApp fields remain **PROPOSED** until BR-013.

## 4. Implemented workflow

1. Operator selects branch and business date.
2. Operator selects the checkpoint period.
3. For each product sold, the operator enters:
   - raw product: quantity in kg or units;
   - processed product: tray count, with estimated kilograms shown from the
     product's current average weight per tray.
4. The system snapshots the average weight, selling price and weight basis.
5. Waste/damage is recorded through the existing M4 waste workflow, not as a
   sale.
6. The operator reviews totals by product and confirms.
7. Confirmation appends one negative `SALES_CHECKPOINT` movement per line and
   refuses negative stock.
8. A confirmed checkpoint is not silently edited; one full reversal with a
   required reason moves it to `CORRECTED`.

## 5. Snapshot and calculation rules

For a processed product:

```text
estimatedWeightGrams = trayCount × averageWeightPerTrayGrams
quantityMilli = measuredWeightGrams ?? estimatedWeightGrams
estimatedSalesValueMinor =
  floor((quantityMilli × sellingPriceAmountMinor + 500) / 1000)
```

For a raw product:

```text
quantityMilli = reported sales quantity in exact thousandths
estimatedSalesValueMinor =
  floor((quantityMilli × sellingPriceAmountMinor + 500) / 1000)
```

Rules:

- Raw lines require `salesUnitId === inventoryUnitId`; unit conversion is not
  implemented (BQ-10).
- Processed lines require the inventory unit `kg`, so grams map 1:1 to
  milli-kilograms.
- The newest selling price whose `effectiveFrom` is on or before the business
  date is snapshotted. A missing price blocks creation.
- Raw prices use `PER_SALES_UNIT`; processed prices use `PER_KILOGRAM`.
- At least one line is required. No-sales checkpoints are not supported (BQ-17).
- Store the snapshot values in the checkpoint item; never recompute history from
  current master data.
- Label estimated values in the UI and reports.
- Distinguish `ESTIMATED` from `MEASURED` weight.
- Distinguish sales from waste/damage; they are different movement reasons.
- If the sales unit differs from the inventory unit, the conversion must be
  explicit. Unit conversion is an open question.

## 6. Validation rules (proposed)

- Branch and business date are required.
- Checkpoint period is required and unique per branch/date/period unless a
  correction path allows a replacement.
- Quantities must be non-negative and at least one line or an explicit "no
  sales" state must be recorded.
- Processed lines require a positive average weight per tray snapshot.
- A raw product must not accept tray fields.
- Selling price is required for lines that contribute revenue.
- A confirmed checkpoint cannot be deleted.
- A correction must reference the original and record actor/reason.

## 7. What is still pending

The following must be confirmed before the workflow is finalized:

1. Exact WhatsApp message fields, order and units.
2. Whether the 12:00/20:00 periods are fixed or configurable.
3. Whether employees report one combined message or two separate checkpoints.
4. Whether "no sales" must be recorded explicitly.
5. Whether a checkpoint can be opened, saved as draft and completed later.
6. Who may correct a checkpoint and whether the original remains visible.
7. How waste/damage is reported through WhatsApp today.
8. Whether prices are branch-specific.
9. How unprocessed products reported in non-kilogram units are reconciled with
   inventory.

## 8. UI expectations (M6)

- Branch + business date + period selector.
- Product rows grouped by raw/processed.
- Tray entry with immediately visible estimated kilograms and value.
- Clear estimated-vs-measured indicator.
- Separate waste/damage entry.
- Totals by product and overall.
- Confirmation step that explains inventory effects.
- Correction view with audit history.

## 9. Tests required and implemented

- Domain calculation and snapshot tests for processed and raw products.
- Snapshot immutability when product weight/price changes.
- State transitions draft → confirmed → corrected.
- Branch/date/period uniqueness and validation.
- Repository tests on both engines.
- Inventory movement integration.
- Browser test for entering and confirming a checkpoint.
- Regression test that a historical checkpoint does not change when master data
  changes.

## 10. Dependencies

Depends on M1 (branch/product/unit), M2 (products, presentations, prices,
average weight) and M4 (inventory movements). Finalization also depends on the
BR-013 product confirmation.
