# Inventory Workflow

> Implementation status: **IMPLEMENTED IN M4.** Branch balances are derived from
> the append-only stock movement ledger. Manual adjustments, waste and
> reconciliation are persisted on both engines and available on `/inventory`.
> Production and sales movements remain M5/M6 work.

## 1. Scope

Inventory is the per-branch record of what a branch has on hand. It covers:

- raw product stock;
- processed/finished product stock;
- stock movements;
- adjustments;
- damaged and discarded products;
- reconciliation of physical counts.

Individual sales transactions are out of scope (BR-009). Sales enter inventory
only through aggregate sales checkpoints (M6).

## 2. Core rules

1. Inventory is independent per branch (BR-022).
2. Every stock-affecting record identifies its branch (BR-023).
3. A movement is append-only: correcting a movement does not erase history
   (ADR 0040).
4. Stock quantity is an exact integer in thousandths of the product's configured
   inventory unit. The database stores `quantity_delta_milli`; `12500` means
   `12.5` units.
5. A stock movement reason names its source category: purchase receiving,
   production output, production input, sales checkpoint, adjustment, waste or
   correction. Transfers between branches are not implemented.
6. The system refuses any operation that would leave a negative balance. There is
   no override in M4 (ADR 0041, TD-018).
7. Raw and finished products are distinct products; one does not silently consume
   the other's balance.
8. A zero balance is a valid derived result, not evidence that no movements
   exist.

## 3. Record model

```text
StockMovement (persisted)
  id
  organizationId
  branchId
  productId
  quantityDeltaMilli     (signed, non-zero, exact thousandths)
  reason                 (RECEIVING | PRODUCTION_OUTPUT | PRODUCTION_INPUT |
                          SALES_CHECKPOINT | ADJUSTMENT | WASTE | CORRECTION)
  sourceType / sourceId  (optional)
  correctsMovementId     (only on CORRECTION)
  occurredAt
  recordedAt
  recordedByUserId
  note

StockBalance (derived, never stored)
  organizationId
  branchId
  productId
  quantityOnHandMilli    (sum of quantityDeltaMilli)
  updatedAt              (latest movement time)

StockAdjustment (persisted audit row)
  kind                   (MANUAL | RECONCILIATION)
  quantityDeltaMilli      (manual adjustment; reconciliation difference)
  expectedQuantityMilli   (reconciliation hand count)
  countedQuantityMilli    (reconciliation counted quantity)
  reason / note
  occurredAt / recordedAt / recordedByUserId

InventoryWaste (persisted audit row)
  quantityMilli           (positive quantity)
  reason / note
  occurredAt / recordedAt / recordedByUserId
```

Balances are aggregated from movements scoped by organization and branch. There
is no balance cache table (ADR 0041). Adjustment and waste rows keep the audit
evidence; the movement is the stock effect.

## 4. Flows

### Initial stock

A branch starts at zero. Opening stock is recorded as a positive `MANUAL`
adjustment with a required reason. The adjustment row and its `ADJUSTMENT`
movement are written in one transaction.

### Receiving

- A confirmed supplier purchase appends one positive `RECEIVING` movement per
  line.
- Registering or cancelling a draft has no stock effect.
- A received purchase is corrected through an audited full reversal that appends
  compensating `CORRECTION` movements and refuses to make any product negative.

### Manual adjustment

- The operator enters a signed, non-zero quantity, a reason and an optional note.
- The resulting balance must be zero or positive.
- The adjustment stores actor and timestamps and appends an `ADJUSTMENT` movement.

### Production

- Raw inputs will create negative movements and finished outputs positive
  movements (M5).
- If raw consumption is not reliably reported, the batch must say so rather than
  inventing quantities. See [PRODUCTION_WORKFLOW.md](./PRODUCTION_WORKFLOW.md).

### Sales

- A confirmed sales checkpoint will create negative movements aggregated per
  product (M6).
- Processed products may be recorded in trays with an estimated-kilogram
  snapshot; the inventory unit and the sold unit must be reconciled explicitly.
- See [SALES_CHECKPOINT_WORKFLOW.md](./SALES_CHECKPOINT_WORKFLOW.md).

### Waste, damage and loss

- The operator enters a positive quantity, a reason and an optional note.
- The audit row stores the positive quantity; the ledger receives a negative
  `WASTE` movement.
- The resulting balance must be zero or positive.

### Reconciliation

- The operator enters the counted quantity, a reason and an optional note.
- The system stores the expected and counted quantities.
- A non-zero difference appends an `ADJUSTMENT` movement and a
  `RECONCILIATION` adjustment row; a zero difference stores the audit row only.
- Prior movements are never overwritten.

## 5. Validation rules

- Movement and adjustment quantities are integers; manual adjustments must be
  non-zero. Waste quantities must be positive. Counted quantities may be zero.
- The product and branch must belong to the organization and be active.
- The reason is required, trimmed and at most 500 characters; the optional note
  is at most 500 characters.
- The movement reason is from the controlled list.
- A correction must reference the movement it corrects and preserve the original.
- A non-correction movement must not carry a correction reference.
- A movement cannot correct itself.
- Negative resulting stock is always refused with `INSUFFICIENT_STOCK`.
- Inventory reads are branch-scoped; a query for branch A never returns branch B
  movements.

## 6. UI

`/inventory` provides:

- a required active-branch picker;
- a stock list for every active product, including zero-stock products;
- unit, on-hand quantity, last movement time and role-aware actions;
- a per-product movement timeline with reason, signed quantity and source;
- adjustment, waste and reconciliation dialogs with validation and clear failure
  copy;
- an empty-state banner when the selected branch has no movements;
- read-only behavior for roles without `inventory:write`.

## 7. Tests

- Domain tests cover quantity signs, reasons, sources, adjustment/waste rules and
  negative-balance refusal.
- Route tests cover balances, histories, adjustments, waste, reconciliation,
  zero-difference counts, insufficient stock, validation, inactive targets and
  branch/product isolation.
- Dual-engine integration tests cover the full receive → adjust → waste →
  reconcile lifecycle.
- REST-client tests cover URLs, payloads and response validation.
- Component tests cover the stock table, history, adjustment flow and refusal
  copy.
- Playwright covers balance/history rendering and the adjustment, waste and
  reconciliation payloads in Chromium.

## 8. Dependencies and resolved questions

Depends on M1 (branch/products/units), M2 (catalog) and M3 (confirmed receiving).

Resolved in M4:

1. Balances are derived from the ledger; there is no cache table (ADR 0041).
2. Negative balances are never allowed and there is no override.
3. Initial stock uses an opening manual adjustment.
4. Transfers between branches are out of scope.
5. Quantities use up to three decimal places, stored as exact integer
   thousandths.
