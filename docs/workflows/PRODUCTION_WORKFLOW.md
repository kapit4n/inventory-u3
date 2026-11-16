# Production Workflow

> Implementation status: **IMPLEMENTED in M5.** Production batches, their
> snapshot fields and the inventory movements they append are available on
> `/production`. See ADR 0042 and TD-019.

## 1. Scope

Production records a branch's preparation of covered trays of cut fruit and
vegetables. It captures who physically prepared the product, who registered it,
how many trays were produced, and the weight assumptions used. Raw consumption
and waste are optional lines on the same batch.

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
8. Waste and production losses are recorded explicitly.
9. Raw and finished inventory are updated through the M4 ledger when the batch is
   confirmed.

## 3. Implemented model

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
  createdByUserId / createdAt / updatedAt
  confirmedByUserId / confirmedAt
  correctedByUserId / correctedAt / correctionReason

ProductionInput             (optional, when reliable)
  batchId
  productId                 (active RAW product)
  unitId                    (product inventory unit)
  quantityMilli
  position

ProductionOutput
  batchId
  productId                 (active PROCESSED product)
  presentationId
  trayCount
  averageWeightPerTrayGrams (snapshot)
  estimatedWeightGrams      (snapshot: trayCount × averageWeight)
  measuredWeightGrams       (optional)
  weightBasis               (ESTIMATED | MEASURED)
  position

ProductionWaste
  batchId
  productId                 (any active product)
  unitId
  quantityMilli
  reason
  note                      (optional)
  position
```

## 4. Workflow

1. The operator chooses the branch and business date.
2. The operator identifies the active employee assigned to that branch.
3. The operator registers one or more outputs: processed product, presentation
   and tray count.
4. The system copies the presentation's current average weight per tray and
   calculates the estimated weight. If reliable measurement exists, the operator
   enters it and the basis becomes `MEASURED`.
5. When reliable raw consumption is reported, the operator adds raw input lines.
6. Waste and losses are recorded separately from the finished outputs.
7. The operator confirms the batch. The API validates references and stock,
   aggregates the net delta per product, and appends movements:
   - raw inputs decrease (`PRODUCTION_INPUT`);
   - finished outputs increase (`PRODUCTION_OUTPUT`);
   - waste decreases the relevant balance (`WASTE`).
8. The batch becomes read-only. A confirmed batch can be reversed once through
   an audited correction; a draft can be discarded.

## 5. Snapshot rules

- The average weight per tray and the estimated total weight are copied into the
  output at batch creation.
- Editing the product's average weight or presentation later does not change the
  batch.
- Measured weight is stored separately; it never overwrites the estimate.
- Confirmed and corrected batches are never silently edited or deleted.
- Production stores quantities and weights, not prices. Estimated production
  value is deferred until the valuation basis is confirmed.

## 6. Validation rules

- Branch, employee and products must belong to the organization; the employee
  must be active and assigned to the batch branch.
- Inputs require active products of kind `RAW`; outputs require active products
  of kind `PROCESSED`; waste may reference any active product.
- Inputs and waste quantities are positive exact integer thousandths. Output
  weight is derived from positive tray counts and a positive average weight.
- At least one input, output or waste line is required. Inputs and waste are
  optional, so input-only and waste-only batches are valid.
- A batch cannot be confirmed twice, corrected unless confirmed, or corrected
  more than once.
- Any operation that would leave a branch balance negative is refused with
  `INSUFFICIENT_STOCK`.
- HTTP responses map domain refusals to `409 DOMAIN_RULE_VIOLATION`; client
  validation uses `422 VALIDATION_ERROR`.

## 7. API

| Method | Path                                  | Permission        |
| ------ | ------------------------------------- | ----------------- |
| GET    | `/api/v1/production?branchId=...`     | `inventory:read`  |
| GET    | `/api/v1/production/:batchId`         | `inventory:read`  |
| POST   | `/api/v1/production`                  | `inventory:write` |
| POST   | `/api/v1/production/:batchId/confirm` | `inventory:write` |
| POST   | `/api/v1/production/:batchId/correct` | `inventory:write` |
| DELETE | `/api/v1/production/:batchId`         | `inventory:write` |

## 8. UI

`/production` provides a branch selector, batch table, detail dialog and
English/Spanish copy. The batch dialog edits inputs, outputs and waste; outputs
show the presentation's average weight and the calculated estimate. Confirmed
batches expose a correction dialog with a required reason; drafts expose discard.

## 9. Tests

- Domain: estimated-weight calculation, snapshot immutability, transitions,
  employee and product-kind validation.
- Persistence: PostgreSQL and SQLite repositories; the PostgreSQL half skips
  without a server (SI-06).
- API integration: create/confirm ledger equalities, branch filtering, measured
  weight, correction reversal and audit, duplicate confirmation, insufficient
  stock, discard and invalid references.
- Client and component tests cover payloads, permissions and failure copy.
- Playwright covers creation, confirmation, correction and draft discard.

## 10. Dependencies and open questions

Depends on M1 (branch/product/unit/presentation), M2 (employees, average weight)
and M4 (inventory movements).

Open:

1. Is there a recipe/bill of materials, or are inputs free-form per batch?
2. Can one batch produce multiple finished products? (Implemented as yes.)
3. Are production losses recorded per input, per output, or as a separate waste
   line? (Implemented as a separate waste line.)
4. Is production tied to a shift or only to a business date? (Implemented as
   business date only.)
5. Are employees a separate master list shared across branches, or branch-local?
6. If production valuation is required, which price snapshot is used?
