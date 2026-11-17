# Purchase and Receiving Workflow

> Implementation status: **IMPLEMENTED (M3).** Multi-line purchases can be
> registered for one branch and supplier, received exactly once into append-only
> stock movements, cancelled while still drafts, and fully reversed through an
> audited correction. Partial receiving, taxes and freight are not implemented;
> supplier detail fields remain open (BQ-21).

## 1. Scope

A purchase records a supplier delivery assigned to one branch. A delivery may
contain multiple products at different quantities and prices. Receiving updates
stock only after it is confirmed (BR-002, BR-023).

Suppliers may deliver daily or every one or two days. The model allows multiple
purchases per branch per date without requiring one delivery per day.

## 2. Confirmed rules

1. Each branch receives deliveries directly from suppliers.
2. A purchase belongs to one branch.
3. A purchase belongs to one supplier.
4. A purchase has one or more items.
5. Each item records product, quantity, unit and purchase price.
6. Stock changes only on confirmed receiving.
7. Purchase price history is preserved by immutable received items.
8. Corrections must be auditable.
9. Receiving is all-or-nothing; partial receiving is not supported.
10. M3 purchase prices contain no tax or freight component.

## 3. Statuses

| Status      | Meaning                                                         |
| ----------- | --------------------------------------------------------------- |
| `DRAFT`     | Entered but not received; stock unchanged.                      |
| `RECEIVED`  | Confirmed; stock movements created.                             |
| `CANCELLED` | Never received; no stock effect.                                |
| `CORRECTED` | A received purchase was fully reversed through an audit record. |

The status vocabulary is implemented as a PostgreSQL enum and a SQLite `CHECK`
constraint. The important boundary remains "registered" versus "received": no
stock movement is created before receiving.

## 4. Workflow

1. An operator with `inventory:write` selects a branch and supplier.
2. The operator registers a delivery date and one or more lines: product,
   quantity, unit and unit price.
3. The API validates that the branch, supplier, products and units belong to the
   caller's organization.
4. The system calculates line and purchase totals using integer minor units and
   integer thousandths of the purchase quantity.
5. Saving creates a `DRAFT`; stock is unchanged.
6. Receiving is a single `DRAFT -> RECEIVED` transition. In one transaction it:
   - marks the purchase received with actor and timestamp;
   - creates one `RECEIVING` stock movement per line;
   - records the source as `PURCHASE_RECEIPT` and the purchase id.
7. The conditional status update and the transaction make receiving exactly once;
   a second request returns `DOMAIN_RULE_VIOLATION`.
8. A draft may be cancelled without stock effect. A received purchase cannot be
   edited or deleted.
9. A received purchase may be corrected. The correction records actor, reason,
   before/after totals and appends a compensating `CORRECTION` movement for every
   receipt movement, referencing the reversed movement.

## 5. Quantities, money and units

- Purchase quantities are stored as integer thousandths (`12.5 kg` = `12_500`).
- Unit prices and totals are integer minor units in the organization currency
  captured when the purchase is created.
- A line total is rounded once, half-up:
  `floor((quantityMilli * unitPriceMinor + 500) / 1000)`.
- Until unit conversion is confirmed (BQ-10), a purchase line unit must equal the
  product's inventory unit. The API rejects a mismatch with `INVALID_INPUT`.
- Stock movements currently store `quantityDelta` as a JavaScript number
  (`double precision` in PostgreSQL, `real` in SQLite), converted from the
  integer thousandths at receiving time.

## 6. Price history

- Each received line is immutable and preserves the unit price paid at that time.
- Changing a product's current master data does not rewrite past purchases.
- A separate purchase-price history table is not needed in M3; received
  `purchase_items` are the history.
- Later cost calculations use received `purchase_items`; M7 daily closing uses
  the latest received purchase price for the product in the branch when the unit
  matches (ADR 0044, TD-021). Weighted-average or FIFO costing is not
  implemented.

## 7. Correction semantics

- Only a `RECEIVED` purchase can be corrected.
- The correction reason is required and trimmed; the maximum length is 500.
- A purchase can have at most one correction, enforced by a unique
  organization/purchase index.
- M3 performs a **full reversal**: `afterTotalMinor = 0`. The original purchase,
  items and receipt movements remain unchanged.
- The purchase becomes `CORRECTED`; the correction stores the actor, reason,
  before/after totals and timestamp.
- Every receipt movement gets a reversal with reason `CORRECTION`, source type
  `PURCHASE_CORRECTION`, `sourceId = correction.id`, and
  `correctsMovementId = originalMovement.id`.
- Replacing a correction with a revised purchase is not implemented; it would be
  a later explicit workflow rather than an edit.

## 8. Validation rules

- Branch and supplier must belong to the operator's organization.
- Every product must belong to the operator's organization.
- At least one item is required.
- Quantity must be a positive integer number of thousandths.
- Unit price must be a non-negative integer number of minor units.
- The purchase note is optional and limited to 500 characters.
- A purchase cannot be received twice.
- A cancelled or corrected purchase cannot be received.
- A received purchase cannot be cancelled or deleted.
- A correction reason is required.
- Duplicate delivery entry is not automatically detected; the exact duplicate
  rule remains **PENDING**.

## 9. API and UI

- Routes: `GET/POST /api/v1/purchases`,
  `GET /api/v1/purchases/:purchaseId`,
  `POST /api/v1/purchases/:purchaseId/receive`,
  `POST /api/v1/purchases/:purchaseId/cancel`,
  `GET /api/v1/purchases/:purchaseId/correction` and
  `POST /api/v1/purchases/:purchaseId/correct`.
- Reads use `inventory:read`; writes use `inventory:write`.
- `/purchases` lists purchases with their branch, supplier, status, delivery
  date, total and line count.
- The purchase form supports multiple lines, comma or dot decimal input for
  quantities with up to three decimals, and minor-unit price entry.
- Receive and cancel act immediately from the list; the correction dialog asks
  for the required audit reason and explains the full reversal.
- The list shows the branch on each row; a branch filter is not part of the M3
  UI, though the list API accepts an optional `branchId`.
- Purchase line prices are displayed with the organization currency stored on the
  purchase.

## 10. Tests

- Domain tests cover positive quantities, non-negative prices, line rounding,
  totals, notes, status transitions, duplicate item ids and correction rules.
- SQLite and PostgreSQL repository tests cover create/find/list, branch filters,
  organization isolation, exactly-once receiving, cancellation, corrections and
  stock-movement source lookup. PostgreSQL cases skip when no server is present.
- Route tests cover create, list, branch filter, receiving, cancellation, invalid
  references, unit mismatch, not found and audited correction.
- REST-client tests cover every purchase function and response validation.
- Component tests cover draft creation, receiving, correction reason validation
  and quantity input.
- Playwright covers the multi-line create payload, explicit receiving and the
  correction dialog on `/purchases`.

## 11. Dependencies and open questions

Depends on M1 (branch, product, unit) and M2 (suppliers, products).

Open:

1. Are purchase prices tax-inclusive? Are taxes modeled at all? (BQ-14)
2. Are freight or other costs part of the purchase cost? (BQ-14)
3. Can one delivery be split across branches? (BQ-13)
4. Are unit conversions needed between purchase and inventory units? (BQ-10)
5. Are payment terms, invoices or supplier balances in scope? (BQ-21)
6. What is the duplicate-delivery rule?
7. Is a corrected purchase ever replaced by a revised record, or is full reversal
   final for M3?
