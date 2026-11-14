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
  organization.ts
  supplier.ts
  index.ts
  sqlite/                     SQLite Drizzle schema
    branch.ts
    catalog.ts
    employee.ts
    defaults.ts
    enum-check.ts
    organization.ts
    supplier.ts
    index.ts
```

The current tables are:

| Table                   | Ownership                | Purpose                                                     |
| ----------------------- | ------------------------ | ----------------------------------------------------------- |
| `organizations`         | tenant root              | Name, timezone, currency and active flag                    |
| `branches`              | organization             | Physical location with independent inventory                |
| `employees`             | organization and branch  | Person whose production work is recorded; no login          |
| `suppliers`             | organization             | Provider referenced by purchases; no login                  |
| `measurement_units`     | organization             | Configurable unit code, name and active flag                |
| `product_categories`    | organization             | Catalog grouping with a name and active flag                |
| `products`              | organization             | Category, raw/processed kind and inventory/sales units      |
| `product_presentations` | organization and product | Presentation name and configured average weight in grams    |
| `product_price_history` | organization and product | Effective-dated selling price, currency, kind-derived basis |
| `users`                 | organization             | Email, password hash, role and active flag                  |
| `sessions`              | organization and user    | Hashed opaque token, issue/expiry and revocation            |

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

## Migrations

```
database/migrations/          PostgreSQL migrations + journal
database/migrations-sqlite/   SQLite migrations + journal
```

Both journals currently contain seven entries, `0000` through `0006`; `0002` adds
branches and the catalog, `0003` adds product kind and average weight, `0004`
adds employees with organization and branch references, `0005` adds
organization-wide suppliers, and `0006` adds effective-dated product price
history on both engines. M2-T4 and M2-T5 did not change the schema because the
catalog and product tables already carried the needed ownership, unique keys and
active-state columns.
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

Seeded master data:

| Area          | Rows                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Branches      | 3 (`Mercado Central`, `Sucursal Palermo`, `Sucursal Belgrano`)                                                |
| Employees     | 4, assigned to the seeded branches                                                                            |
| Suppliers     | 3                                                                                                             |
| Units         | 6 (`kg`, `unit`, `tray`, `box`, `bunch`, `bag`)                                                               |
| Categories    | 4 (`Frutas`, `Verduras`, `Frutas y verduras preparadas`, `Hierbas aromáticas`)                                |
| Products      | 21 raw and processed fruit, vegetable and herb products                                                       |
| Presentations | 6 trays for the processed products                                                                            |
| Price history | 27 effective-dated selling-price rows (current prices from `2026-11-01`, some earlier rows from `2026-06-01`) |

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
