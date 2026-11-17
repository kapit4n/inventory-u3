# Database

Inventory U3 uses Drizzle ORM with two explicit engines:

- **SQLite** for the default local and product workflow
- **PostgreSQL** retained as the second engine

There is no third engine and no abstraction layer over the two (ADR 0025).

## Schema

```
database/schema/              PostgreSQL Drizzle schema
  branch.ts
  catalog.ts
  employee.ts
  enums.ts
  inventory.ts
  organization.ts
  production.ts
  purchase.ts
  sales-checkpoints.ts
  supplier.ts
  index.ts
  sqlite/                     SQLite Drizzle schema
    branch.ts
    catalog.ts
    employee.ts
    defaults.ts
    enum-check.ts
    inventory.ts
    organization.ts
    production.ts
    purchase.ts
    sales-checkpoints.ts
    supplier.ts
    index.ts
```

The current tables are:

| Table                    | Ownership                   | Purpose                                                     |
| ------------------------ | --------------------------- | ----------------------------------------------------------- |
| `organizations`          | tenant root                 | Name, timezone, currency and active flag                    |
| `branches`               | organization                | Physical location with independent inventory                |
| `employees`              | organization and branch     | Person whose production work is recorded; no login          |
| `suppliers`              | organization                | Provider referenced by purchases; no login                  |
| `measurement_units`      | organization                | Configurable unit code, name and active flag                |
| `product_categories`     | organization                | Catalog grouping with a name and active flag                |
| `products`               | organization                | Category, raw/processed kind and inventory/sales units      |
| `product_presentations`  | organization and product    | Presentation name and configured average weight in grams    |
| `product_price_history`  | organization and product    | Effective-dated selling price, currency, kind-derived basis |
| `purchases`              | organization and branch     | Supplier delivery with status, date, currency and totals    |
| `purchase_items`         | organization and purchase   | Immutable product, quantity, unit and purchase price        |
| `purchase_corrections`   | organization and purchase   | Audited full reversal with reason and before/after totals   |
| `stock_movements`        | organization and branch     | Append-only stock change with reason and source             |
| `stock_adjustments`      | organization and branch     | Audited manual adjustment or physical-count reconciliation  |
| `inventory_waste`        | organization and branch     | Audited positive waste quantity with reason                 |
| `production_batches`     | organization and branch     | Prepared/registered batch with status and audit fields      |
| `production_inputs`      | organization and batch      | Optional raw product, unit, quantity and position           |
| `production_outputs`     | organization and batch      | Presentation, tray count, weight snapshots and basis        |
| `production_waste`       | organization and batch      | Explicit production loss with product, quantity and reason  |
| `sales_checkpoints`      | organization and branch     | Sales period with status, auditor fields and period key     |
| `sales_checkpoint_items` | organization and checkpoint | Immutable product, quantity, weight and price snapshots     |
| `users`                  | organization                | Email, password hash, role and active flag                  |
| `sessions`               | organization and user       | Hashed opaque token, issue/expiry and revocation            |

Branch, employee, supplier and catalog tables carry `organization_id`.
Employees also carry `branch_id`; suppliers and catalog master data are
organization-wide (TD-009, TD-013) because branches own stock and purchases, not
private supplier or catalog copies. Every operational table must carry both
`organization_id` and `branch_id` (ADR 0039). Products carry a required `kind`
(`RAW` or `PROCESSED`; PostgreSQL enum and SQLite `CHECK`) and presentations carry
a non-null `average_weight_grams`, validated as a positive integer by the domain
(TD-010). Price history carries `amount_minor`, `currency`, `price_basis`,
`effective_from` and `created_at`, with a unique product/effective-date key and a
lookup index; it is append-only and organization-wide until BQ-06 is answered
(TD-016).

Purchases carry `organization_id`, `branch_id`, `supplier_id`, `status`,
`delivery_date`, captured `currency`, integer `total_minor`, optional note and
actor/timestamp fields for creation, receiving and correction. Items carry
`quantity_milli`, `unit_price_minor`, `line_total_minor` and a 1-based `position`;
they are immutable after creation. `purchase_corrections` has a unique
organization/purchase key, so a purchase has at most one correction (TD-017).
`stock_movements` is append-only and stores a signed non-zero
`quantity_delta_milli`, reason, optional source type/id, optional
`corrects_movement_id`, occurrence and recording timestamps, actor and note
(ADR 0040). Quantities are exact integer thousandths; balance is derived by
summing movements per organization, branch and product, and no
`stock_balances` table exists (ADR 0041, TD-018). Receiving writes `RECEIVING`
movements sourced by `PURCHASE_RECEIPT`; correction writes `CORRECTION` movements
sourced by `PURCHASE_CORRECTION`; manual adjustments and reconciliation write
`ADJUSTMENT`; waste writes `WASTE`.

`stock_adjustments` stores `kind` (`MANUAL` or `RECONCILIATION`), a signed
`quantity_delta_milli`, optional `expected_quantity_milli` and
`counted_quantity_milli`, reason, note and actor/time fields. `inventory_waste`
stores a positive `quantity_milli`, reason, note and actor/time fields. Both have
organization/branch/occurred and organization/product indexes.

`production_batches` stores branch, business date, preparer employee, registering
user, `DRAFT | CONFIRMED | CORRECTED` status, note, creation, confirmation and
correction actor/time fields with a required correction reason. Inputs carry the
raw product, inventory unit, `quantity_milli` and position. Outputs carry the
processed product, presentation, tray count, snapshotted average weight and
estimated weight, optional measured weight and `ESTIMATED | MEASURED` basis.
Production waste carries product, unit, positive `quantity_milli`, reason, note
and position. Confirmation writes one net movement per affected product with
source `PRODUCTION_BATCH`; correction writes linked `CORRECTION` movements
(ADR 0042, TD-019).

`sales_checkpoints` stores branch, business date, `MORNING | EVENING` period,
`DRAFT | CONFIRMED | CORRECTED` status, registering user, note and confirmation
and correction actor/time fields with a required correction reason. The
organization/branch/date/period unique index prevents parallel reports for one
period. Items snapshot the product kind, unit, quantity in integer thousandths,
optional presentation/tray/weight data, selling-price amount/basis/currency and
estimated sales value. Raw lines require a quantity and use
`NOT_APPLICABLE` weight basis; processed lines require a presentation and tray
count, snapshot the average tray weight, and record `ESTIMATED` or `MEASURED`
weight. Confirmation appends negative `SALES_CHECKPOINT` movements sourced by
`SALES_CHECKPOINT`; correction writes linked `CORRECTION` movements. See the
sales-checkpoint workflow and TD-020.

`daily_closings` stores one versioned snapshot per branch and business date with
`DRAFT | REVIEWED | CONFIRMED | REOPENED` status, organization currency, source
counts/totals, estimated revenue/cost/profit, warning counts and review,
confirmation and reopening audit fields. The organization/branch/date/version
key is unique; reopening marks the confirmed row and creates a new draft linked
by `previous_closing_id`. `daily_closing_items` stores product quantities for
opening, purchasing, production, sales, waste, adjustments, corrections,
reconciliation differences and closing stock, plus estimated revenue, optional
unit cost, cost basis and position. Cost basis values are
`LATEST_PURCHASE_PRICE | UNAVAILABLE`. See ADR 0044 and TD-021.

## Migrations

```
database/migrations/          PostgreSQL migrations + journal
database/migrations-sqlite/   SQLite migrations + journal
```

Both journals currently contain thirteen entries, `0000` through `0012`; `0002` adds
branches and the catalog, `0003` adds product kind and average weight, `0004`
adds employees with organization and branch references, `0005` adds
organization-wide suppliers, `0006` adds effective-dated product price history,
`0007` adds purchases, purchase items, corrections and stock movements, `0008`
adds the `PURCHASE_CORRECTION` source type plus the unique
organization/purchase correction index, and `0009` converts movement quantities
to integer thousandths, adds `stock_adjustments` and `inventory_waste`, and adds
the branch/product movement index; `0010` adds the production status/weight-basis
enums and the four production tables with their indexes; `0011` adds the sales
checkpoint status/period/weight-basis enums and the two sales-checkpoint tables
with their indexes and period uniqueness; `0012` adds the daily-closing
status/cost-basis enums and the two closing snapshot tables with their version,
branch/date and product keys. M2-T4 and M2-T5 did not
change the schema
because the catalog and product tables already carried the needed ownership,
unique keys and active-state columns. The SQLite `0008` migration rebuilds
`stock_movements` to extend its source-type `CHECK` constraint; `0009` rebuilds
it again to convert quantities and rename the column.
Generate both engines when the schema changes:

```bash
pnpm --filter @inventory-u3/database run db:generate
pnpm --filter @inventory-u3/database run db:generate:sqlite
```

Apply and seed:

```bash
pnpm run db:migrate
pnpm run db:seed
```

The default `.env` points at `sqlite:./data/inventory-u3.db`. The `data/`
directory is ignored by git.

SQLite cannot add a `NOT NULL` column without a default to an existing table in
one statement. Drizzle therefore generates a table rebuild; if the table already
has rows, the migration fails or loses data. Add the column while the table is
empty, or write an explicit data migration and test it on a populated database.

## Seed data

`database/development-data.ts` contains the fixed organization id, development
users and a sample fruit-and-vegetable catalogue. `database/seed.ts` writes them
using the same password hashing implementation the API uses. Every row uses a
fixed id, so the seed is idempotent and restores the sample data on each run.
It also writes illustrative inventory: opening balances, waste reports,
physical-count reconciliations, production batches and sales checkpoints linked
to their ledger movements.

Seeded master data:

| Area          | Rows                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Branches      | 3 (`Mercado Central`, `Sucursal Palermo`, `Sucursal Belgrano`)                                                |
| Employees     | 4, assigned to the seeded branches                                                                            |
| Suppliers     | 3                                                                                                             |
| Units         | 6 (`kg`, `unit`, `tray`, `box`, `bunch`, `bag`)                                                               |
| Categories    | 4 (`Frutas`, `Verduras`, `Frutas y verduras preparadas`, `Hierbas aromáticas`)                                |
| Products      | 21 raw and processed fruit, vegetable and herb products                                                       |
| Stock         | 22 adjustments (19 opening balances and 3 reconciliations, one with no difference)                            |
| Waste         | 5 positive waste reports                                                                                      |
| Production    | 3 batches (1 draft, 1 confirmed, 1 corrected), 7 inputs, 3 outputs and 2 waste lines                          |
| Sales         | 10 checkpoints (3 draft, 5 confirmed, 2 corrected) and 24 product lines                                       |
| Daily closing | 0 seeded; operators create versioned snapshots. No purchases are seeded, so estimated cost is `UNAVAILABLE`   |
| Movements     | 57 ledger rows (21 adjustment, 5 waste reports, 10 production and 21 sales/correction movements)              |
| Presentations | 6 trays for the processed products                                                                            |
| Price history | 27 effective-dated selling-price rows (current prices from `2026-11-01`, some earlier rows from `2026-06-01`) |

The seed deliberately contains no purchases, so a seeded daily closing shows
`missingCostProductCount` rather than an invented cost. Add purchase fixtures if
a development demo needs available latest-purchase cost.

Development users:

| Email                    | Role            |
| ------------------------ | --------------- |
| `admin@inventory.test`   | `ADMINISTRATOR` |
| `manager@inventory.test` | `MANAGER`       |
| `staff@inventory.test`   | `STAFF`         |

The development password is `inventory-dev` and is not a production secret.
The catalogue is illustrative development data, not confirmed business master
data: BQ-19 still asks for the real branch names and the real product and price
master data must replace these rows when available.

## Rules

- No database access from React or Tauri.
- No Drizzle imports in the domain.
- Repository methods exist twice, once per engine.
- A schema change updates both schema trees and both migration journals.
- `pnpm run guard:boundaries` compares the declared table sets and journal entry
  counts so a one-engine change fails the guard.
- IDs are UUID strings; timestamps are ISO instants.
