# Production Workflow

> Implementation status: **NOT_IMPLEMENTED.** No production batch table exists.
> This is the design target for M5.

## 1. Scope

Production records a branch's preparation of covered trays of cut fruit and
vegetables. It captures who physically prepared the product, who registered it,
how many trays were produced, and the weight/price assumptions used.

## 2. Confirmed rules

1. Production belongs to one branch.
2. Production identifies the employee who physically prepared the product. (The
   employee is not necessarily an application user.)
3. Production identifies the operator who registered it in the application.
4. Production registers finished product and tray quantity (BR-015).
5. Production snapshots the average weight per tray used (BR-018).
6. Production estimates total production weight from tray count × average weight.
7. Raw-material consumption may be registered when reliable information is
   available.
8. Waste and production losses must be supported.
9. Raw and finished inventory are updated appropriately (M4).

## 3. Proposed model

```text
ProductionBatch
  id
  organizationId
  branchId
  businessDate
  preparedByEmployeeId      (physical preparer)
  registeredByUserId        (operator)
  status                    (DRAFT | CONFIRMED | CORRECTED)
  note
  createdAt / confirmedAt

ProductionInput             (optional, when reliable)
  batchId
  productId                 (raw product)
  quantity
  unitId
  snapshot of unit/label

ProductionOutput
  batchId
  productId                 (processed product)
  presentationId
  trayCount
  averageWeightPerTrayKg    (snapshot)
  estimatedTotalWeightKg    (snapshot)
  weightBasis               (ESTIMATED | MEASURED)
```

The names are **PROPOSED**. The snapshot fields are required by the confirmed
requirements. Whether raw inputs are mandatory is **PENDING**.

## 4. Proposed workflow

1. The operator chooses the branch and business date.
2. The operator identifies the preparing employee.
3. The operator registers one or more outputs: finished product, tray count and
   presentation.
4. The system reads the current average weight per tray and snapshots it.
5. The system calculates estimated total weight.
6. If reliable raw consumption is reported, the operator adds input lines.
7. Waste/losses are recorded explicitly, not folded into the output.
8. The operator confirms the batch; inventory movements are created:
   - raw inputs decrease;
   - finished outputs increase;
   - waste decreases the relevant balance.
9. The batch becomes read-only; corrections use an audited path.

## 5. Snapshot rules

- The average weight per tray is copied into the output line at confirmation.
- Editing the product's average weight later does not change the batch.
- If measured weight is available, store it separately with a `MEASURED` basis;
  do not overwrite the estimate.
- Price is not required on production, but estimated production value may be
  calculated for closing using a snapshotted reference. The valuation basis is
  **PENDING**.

## 6. Validation rules (proposed)

- Branch and employee must belong to the organization; the employee must be
  assigned to the branch.
- Tray count must be non-negative; a confirmed batch should have at least one
  output or an explicit waste record.
- Average weight per tray must be positive for processed outputs.
- Raw inputs, when present, must use the product's configured unit.
- A confirmed batch cannot be silently edited or deleted.
- A correction must reference the original batch and preserve its snapshots.

## 7. UI expectations (M5)

- Branch and date selector.
- Employee picker.
- Output lines with product/presentation, tray count and calculated estimated
  weight.
- Optional raw-input lines with a clear "reported" vs "not reported" state.
- Waste/loss entry.
- Confirmed batch read-only view with snapshot values visible.
- Correction flow with audit reason.

## 8. Tests required

- Domain calculation of estimated weight from tray count and snapshot weight.
- Snapshot immutability: changing product configuration does not alter history.
- State transition tests for draft → confirmed, confirmed → corrected.
- Repository tests on both engines.
- Branch isolation and employee assignment validation.
- Inventory movement integration test for inputs/outputs/waste.
- Browser test for registering and confirming a batch.

## 9. Dependencies and open questions

Depends on M1 (branch/product/unit/presentation), M2 (employees, average weight)
and M4 (inventory movements).

Open:

1. Is raw-material consumption always recorded, or only when reliable?
2. Is there a recipe/bill of materials, or are inputs free-form per batch?
3. Can one batch produce multiple finished products?
4. Are production losses recorded per input, per output, or as a separate waste line?
5. Is production tied to a shift or only to a business date?
6. Are employees a separate master list shared across branches, or branch-local?
