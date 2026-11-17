# Inventory U3 — Business Domain Model

> Status: **PROPOSED business model** unless an entity is explicitly marked
> **IMPLEMENTED** below. The current repository implements the
> organization/user/session foundation, the `Branch` entity, the product
> catalog (units, categories, products, presentations, raw/processed kind and
> average-weight configuration), effective-dated selling prices, supplier
> purchases and receiving, audited purchase corrections, and persisted
> append-only stock movements. Stock balances, estimated/measured weights,
> production, sales and closing remain a design target, not a description of
> working software.

## 1. Structure of the model

The model sits inside one organization (the existing tenant boundary) and adds a
second, lower boundary: **the branch**. Every operational record belongs to one
organization and one branch.

```text
Organization
  ├── Branch (3 in the initial business)
  │     ├── inventories / stock balances
  │     ├── purchases / receiving
  │     ├── production batches
  │     ├── sales checkpoints
  │     └── daily closings
  ├── User (application account, initially central operator)
  │     └── Role / Permission (existing foundation)
  └── Employee (person whose work is recorded; may not log in)
```

`Organization`, `Branch`, the organization-wide catalog and purchase records
are implemented, as are the branch inventory, production, sales-checkpoint and
daily-closing records below the branch. Audit logging and branch-scoped user
assignment remain proposed.

## 2. Entity inventory

### Implemented today

| Entity                | Purpose                                       | Evidence                                                   |
| --------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| Organization          | Tenant boundary: name, timezone, currency     | `packages/domain/src/organization/organization.ts`         |
| Branch                | Organization-owned physical business location | `packages/domain/src/branch/branch.ts`                     |
| MeasurementUnit       | Organization-owned code/name for a unit       | `packages/domain/src/product/measurement-unit.ts`          |
| ProductCategory       | Organization-owned product grouping           | `packages/domain/src/product/product-category.ts`          |
| Product               | Organization-owned item with explicit units   | `packages/domain/src/product/product.ts`                   |
| ProductPresentation   | Product packaging with average weight         | `packages/domain/src/product/product-presentation.ts`      |
| ProductPriceHistory   | Effective-dated selling price per product     | `packages/domain/src/product/product-price-history.ts`     |
| Employee              | Branch-owned preparer identity; no login      | `packages/domain/src/employee/employee.ts`                 |
| Supplier              | Organization-wide provider of deliveries      | `packages/domain/src/supplier/supplier.ts`                 |
| Purchase              | Multi-line supplier delivery for one branch   | `packages/domain/src/purchase/purchase.ts`                 |
| PurchaseItem          | Product, quantity, unit and purchase price    | `packages/domain/src/purchase/purchase.ts`                 |
| PurchaseCorrection    | Audited full reversal of a received purchase  | `packages/domain/src/purchase/purchase-correction.ts`      |
| StockMovement         | Persisted append-only stock change            | `packages/domain/src/stock/stock-movement.ts`              |
| User                  | Organization-scoped login account             | `packages/domain/src/organization/auth.ts`                 |
| Role                  | `ADMINISTRATOR`, `MANAGER`, `STAFF`           | `packages/domain/src/organization/roles.ts`                |
| Permission            | Domain permission values checked by the API   | `packages/domain/src/organization/roles.ts`                |
| Session               | Opaque bearer session, stored as a token hash | `packages/domain/src/organization/auth.ts`                 |
| Organization settings | Name, timezone, currency update rules         | `packages/domain/src/organization/organization.ts`         |
| StockBalance          | Derived on-hand read model, never stored      | `packages/domain/src/stock/stock-balance.ts`               |
| StockAdjustment       | Audited manual adjustment or count correction | `packages/domain/src/stock/stock-adjustment.ts`            |
| InventoryWaste        | Audited positive waste report                 | `packages/domain/src/stock/inventory-waste.ts`             |
| ProductionBatch       | Branch production with inputs and outputs     | `packages/domain/src/production/production-batch.ts`       |
| SalesCheckpoint       | Aggregate branch/date/period sales report     | `packages/domain/src/sales-checkpoint/sales-checkpoint.ts` |
| DailyClosing          | Versioned reviewed end-of-day summary         | `packages/domain/src/daily-closing/daily-closing.ts`       |

`StockMovement` is persisted from M3 receiving, corrections and M4 adjustments,
waste and reconciliation. `StockBalance` is a derived read model summed from
those movements; there is deliberately no balance table (ADR 0041). Negative
stock is refused and there is no override (BQ-08 resolved). Manual adjustments,
inventory waste and physical-count reconciliation are implemented and audited.
M5 production, M6 sales checkpoints and M7 daily closings store their own
snapshots and integrate with the ledger where they create movements.

### Proposed for the remaining milestones

| Entity               | Purpose                                                     | Milestone | Key relationships                                 |
| -------------------- | ----------------------------------------------------------- | --------- | ------------------------------------------------- |
| AuditLog             | Append-only record of significant changes and corrections   | M9        | actor, action, entity, before/after payload, time |
| UserBranchAssignment | Future mapping of an application user to allowed branch(es) | M9        | User to Branch                                    |

Names are deliberately domain-specific. If implementation chooses different
names, update this table and the ADR before writing code.

## 3. Raw products vs processed products

The distinction is central to measurement and to which workflow applies. It is
implemented as the required `ProductKind` (`RAW` or `PROCESSED`) and is consumed
by the production, sales-checkpoint and daily-closing workflows.

### Raw product

- Received from a supplier and sold or consumed without tray preparation.
- Measured in its configured inventory/sales unit: kilogram or unit.
- No tray conversion is applied to quantities (BR-021).
- Examples: a box of bananas sold by kilogram, a bag of lemons sold by unit.

### Processed product

- Prepared by a branch as covered trays of cut fruit or vegetables.
- Has a configurable average weight per tray and a selling price per kilogram.
- Sales quantity is expressed as a tray count; the system estimates kilograms.
- A production batch records the tray count and snapshots the average weight used.
- Examples: a tray of cut watermelon, a tray of mixed fruit.

### Relationship between raw and finished products

A production batch may consume raw products (`ProductionInput`) and produce
processed products (`ProductionOutput`). The relationship is intentionally
transactional, not a fixed bill-of-materials:

- The same raw product may be used in several finished products.
- The same finished product may be produced from different raw products.
- Recording reliable raw consumption is desirable but may be optional in the
  first version; see the open question in `docs/open-questions.md`.

No bill-of-materials or recipe entity is proposed yet. Do not invent one until
production data requirements are confirmed.

## 4. Product measurement configuration

The catalog identity, the raw/processed kind and the average weight per tray are
implemented. A product references an inventory unit and a sales unit, with
optional purchase and production units; a presentation carries a positive
integer `averageWeightGrams`. The following table mixes what exists with what
M2/M5/M6 must add; do not read an unimplemented row as a column.

| Concept             | Applies to     | Meaning                                                          |
| ------------------- | -------------- | ---------------------------------------------------------------- |
| Purchase unit       | Raw, processed | Unit the supplier sells in; may differ from inventory/sales unit |
| Inventory unit      | Raw, processed | Unit stock is counted in                                         |
| Production unit     | Processed      | Unit used when reporting production output (usually trays)       |
| Sales unit          | Raw, processed | Unit used at the sales checkpoint (kg, unit or tray)             |
| Presentation        | Processed      | Physical format, e.g. covered tray                               |
| Average weight/tray | Processed      | Configured positive grams per tray; shown as kilograms           |
| Selling price/kg    | Processed      | Price per kilogram used to value estimated weight                |
| Selling price/unit  | Raw            | Price per configured unit where sold by unit                     |

Rules:

- A raw product is not forced through tray conversion.
- A processed product must not silently use a raw product's measurement unit.
- Unit conversion factors between purchase, inventory and sales units are not
  implemented yet. Until they are, a purchase line unit must equal the product's
  inventory unit (BQ-10).
- Currency and money values use the existing integer-minor-unit convention in
  `packages/types`.
- Average weight is stored as integer grams (TD-010); no estimated or measured
  weight record exists yet.

## 5. Historical snapshots

Historical records must remain explainable even after master data changes
(BR-018, BR-019). The model therefore snapshots values at the moment of the
transaction rather than joining to current configuration.

### Production snapshot

`ProductionOutput` (or the batch output line) preserves at least:

- product and presentation reference
- tray quantity produced
- average weight per tray used, in kilograms
- resulting estimated total weight
- production date/branch/actor

### Sales snapshot

`SalesCheckpointItem` preserves at least:

- product reference
- quantity in the sales unit
- tray quantity, when applicable
- average weight per tray used (for processed products)
- estimated kilograms (for processed products)
- selling price per kilogram or per unit used
- resulting estimated sales value
- whether the weight was estimated or actually measured

### Snapshot rules

1. Snapshot values are written once, at confirmation, and are not recomputed.
2. Editing a product's average weight or price creates/updates the master record
   only; it does not rewrite history.
3. Stock corrections are new movements that reference the original (ADR 0040).
   M3 purchase corrections are audited full reversals with a reason and
   before/after totals; sales and production correction mechanics remain
   **PENDING** (BQ-03).
4. Estimated weight and measured weight are separate concepts and must not be
   stored in the same field without a discriminator.

## 6. Branch ownership and reporting

- Every operational entity carries `branchId`; organization scope is inherited
  through the branch and must also be enforced for tenant safety.
- Branch-scoped queries must never return another branch's records to a future
  branch user.
- Consolidated owner reports intentionally query across all branches of the
  organization.
- The current `Organization` tenant remains the top-level security boundary. A
  branch is a business boundary inside it, not a replacement for it.
- Initial and future access rules are recorded in
  [ACCESS_MODEL.md](./ACCESS_MODEL.md).

## 7. What is deliberately not modeled yet

- Recipes / bills of materials.
- Customer orders, invoices or payments.
- Employee payroll or attendance.
- Supplier payments, accounts payable or taxes.
- Transfers between branches.
- Offline or synchronization state.
- Branch-specific product price lists (whether they are needed is pending).

These are not placeholders. Add them only when a confirmed requirement and a
milestone call for them.
