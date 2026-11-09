# Purchase and Receiving Workflow

> Implementation status: **NOT_IMPLEMENTED.** No supplier, purchase or receiving
> table exists. This is the design target for M3.

## 1. Scope

A purchase records a supplier delivery assigned to one branch. A delivery may
contain multiple products at different quantities and prices. Receiving updates
stock only after it is confirmed (BR-002, BR-023).

Suppliers may deliver daily or every one or two days. The model must allow
multiple purchases per branch per date without requiring one delivery per day.

## 2. Confirmed rules

1. Each branch receives deliveries directly from suppliers.
2. A purchase belongs to one branch.
3. A purchase belongs to one supplier.
4. A purchase has one or more items.
5. Each item records product, quantity, unit and purchase price.
6. Stock changes only on confirmed receiving.
7. Purchase price history is preserved for later cost/valuation use.
8. Corrections must be auditable.

## 3. Proposed statuses

| Status      | Meaning                                                     |
| ----------- | ----------------------------------------------------------- |
| `DRAFT`     | Entered but not received; stock unchanged.                  |
| `RECEIVED`  | Confirmed; stock movements created.                         |
| `CANCELLED` | Never received; no stock effect.                            |
| `CORRECTED` | A received purchase has been corrected via an audited path. |

The exact status names are **PROPOSED**. The important confirmed distinction is
between "registered" and "received".

## 4. Proposed workflow

1. The operator selects a branch and supplier.
2. The operator registers delivery date/business date and one or more lines:
   product, quantity, purchase unit, unit price.
3. The system calculates line and purchase totals using money minor units.
4. The operator saves a draft or proceeds to receiving.
5. On confirmation:
   - the purchase is marked received;
   - stock movements are created for each line;
   - purchase-price history is recorded;
   - the actor and timestamp are recorded.
6. After confirmation, editing is not a silent overwrite. A correction creates an
   auditable adjustment/reversal and a replacement record, or an amended record
   with before/after history. The exact mechanism is **PENDING**.

## 5. Price history

- Each received line preserves the unit price paid at that time.
- Changing a product's current purchase price does not rewrite past purchases.
- Later cost calculations may use the latest, weighted-average or another basis.
  That basis is **PENDING** and belongs to daily closing (M7).

## 6. Validation rules (proposed)

- Branch and supplier must belong to the operator's organization.
- At least one item is required to receive a purchase.
- Quantity must be positive; price must be non-negative.
- The product's purchase unit must be a configured unit.
- A purchase cannot be received twice.
- A received purchase cannot be deleted.
- A correction must reference the original and record the reason and actor.
- Duplicate delivery entry should be detectable (supplier + branch + date +
  reference), but the exact duplicate rule is **PENDING**.

## 7. UI expectations (M3)

- Supplier list/create.
- Purchase entry form with a branch selector and multiple line items.
- Draft vs received state clearly visible.
- Receive confirmation that explains stock will change.
- Purchase detail with line prices and totals.
- Correction flow with a visible audit note.

## 8. Tests required

- Domain validation for positive quantities, non-negative prices and state
  transitions.
- Receiving is idempotent and cannot run twice.
- Repository tests on both engines, including multi-line purchases.
- Branch isolation tests.
- Price-history test: changing a product price does not alter history.
- Integration test: receive a purchase and verify stock movements.
- Browser test: create a purchase and confirm receiving.

## 9. Dependencies and open questions

Depends on M1 (branch, product, unit) and M2 (suppliers, products).

Open:

1. Are purchase prices tax-inclusive? Are taxes modeled at all?
2. Are freight or other costs part of the purchase cost?
3. Can one delivery be split across branches?
4. Is partial receiving allowed?
5. Who may confirm receiving: the central operator only, or an administrator?
6. Are payment terms, invoices or supplier balances in scope? (Currently not.)
7. What is the exact correction/reversal rule?
