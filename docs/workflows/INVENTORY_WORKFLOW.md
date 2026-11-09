# Inventory Workflow

> Implementation status: **DOMAIN CONCEPTS ONLY.** The branch and product catalog
> tables exist. M1-T4 defines the stock movement vocabulary, invariants and
> balance shape; there is still no stock table, repository or inventory screen.
> This is the design target for M4.

## 1. Scope

Inventory is the per-branch record of what a branch has on hand. It covers:

- raw product stock;
- processed/finished product stock;
- stock movements;
- adjustments;
- damaged and discarded products;
- reconciliation of physical counts.

Individual sales transactions are out of scope (BR-009). Sales enter the
inventory only through aggregate sales checkpoints (M6).

## 2. Core rules

1. Inventory is independent per branch (BR-022).
2. Every stock-affecting record identifies its branch (BR-023).
3. A movement is append-only: correcting a movement does not erase history
   (ADR 0040).
4. Stock quantity is expressed in the product's configured inventory unit.
5. A stock movement reason names its source category: purchase receiving,
   production output, sales checkpoint, adjustment, waste or correction
   (transfer is future). A source-record reference is optional until that record
   type exists.
6. The system must not let stock go negative by default. Whether an override is
   ever allowed is an open question.
7. Raw and finished products are distinct products; one does not silently consume
   the other's balance.

## 3. Proposed record model

```text
StockMovement (domain concept implemented; not persisted)
  id
  organizationId
  branchId
  productId
  quantityDelta        (signed, in inventory unit)
  reason               (RECEIVING | PRODUCTION_OUTPUT | PRODUCTION_INPUT |
                        SALES_CHECKPOINT | ADJUSTMENT | WASTE | CORRECTION)
  sourceType / sourceId   (optional)
  correctsMovementId      (only on CORRECTION)
  occurredAt
  recordedAt
  recordedByUserId
  note

StockBalance (type only in M1-T4; no factory or table)
  organizationId
  branchId
  productId
  quantityOnHand
  updatedAt
```

Whether `StockBalance` is a maintained cache or a derived view is **PENDING**.
The movement ledger is the source of truth either way. A cached balance may only
be updated inside the same transaction as the movement that changes it.

The implemented domain enforces a signed, finite, non-zero quantity, a known
reason and a known source type. A correction must reference a different
movement; a non-correction must not carry a correction reference. Created
movements and source references are frozen at runtime. No reversal arithmetic,
negative-stock policy or approval rule is implemented.

## 4. Proposed flows

### Initial stock

- A branch starts with zero stock or with an opening balance recorded as an
  audited adjustment. The choice is **PENDING**.

### Receiving

- A confirmed supplier purchase creates positive movements for its lines.
- Stock is not updated when a purchase is only registered; it updates on
  confirmed receiving (see [PURCHASE_WORKFLOW.md](./PURCHASE_WORKFLOW.md)).

### Production

- Raw inputs consumed create negative movements.
- Finished outputs create positive movements.
- If raw consumption is not reliably reported, the batch must say so rather than
  inventing quantities. See [PRODUCTION_WORKFLOW.md](./PRODUCTION_WORKFLOW.md).

### Sales

- A confirmed sales checkpoint creates negative movements aggregated per product.
- Processed products may be recorded in trays with an estimated-kilogram
  snapshot; the inventory unit and the sold unit must be reconciled explicitly.
- See [SALES_CHECKPOINT_WORKFLOW.md](./SALES_CHECKPOINT_WORKFLOW.md).

### Waste, damage and loss

- Recorded as movements with a reason, not as silent reductions.
- Must be distinguishable from sales in reports.
- Who may record waste and whether evidence is required are open questions.

### Adjustments and reconciliation

- A physical count compares counted quantity with expected quantity.
- The difference is stored as an adjustment with a reason and actor.
- A reconciliation must not overwrite prior movements.
- Whether adjustments need approval is **PENDING**.

## 5. Validation rules (proposed)

- A movement quantity must be non-zero.
- The product must belong to the organization; the branch must too.
- The movement reason must be from a controlled list.
- A source record must exist and belong to the same branch when `sourceId` is
  present.
- Negative resulting stock is refused unless an explicit override is authorized
  (open question).
- A correction must reference the record it corrects and preserve the original.
- A non-correction movement must not carry a correction reference.
- A movement cannot correct itself.

## 6. UI expectations (M4)

- Branch picker; the operator chooses the branch before viewing stock.
- Stock list by product with unit and on-hand quantity.
- Item movement timeline.
- Adjustment/waste form with reason.
- Reconciliation screen that shows expected vs counted vs difference.
- Clear empty state when a branch has no stock records.

## 7. Tests required

- Domain rules for movement signs, reasons and non-negative stock.
- Repository tests for both engines.
- Branch isolation: a query for branch A never returns branch B rows.
- Reconciliation produces the expected adjustment.
- Integration test for a full receive → produce → sell → reconcile cycle.
- Browser test for the stock list and adjustment flow.

## 8. Dependencies and open questions

Depends on M1 (branch/products/units) and M3 (confirmed receiving).

Open:

1. Derived balance or maintained cache?
2. Are negative balances ever allowed?
3. Does initial stock use an opening adjustment?
4. Are transfers between branches in scope? (Currently not in M1–M9.)
5. What precision does each inventory unit require?
