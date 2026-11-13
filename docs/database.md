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

| Table                   | Ownership                | Purpose                                                  |
| ----------------------- | ------------------------ | -------------------------------------------------------- |
| `organizations`         | tenant root              | Name, timezone, currency and active flag                 |
| `branches`              | organization             | Physical location with independent inventory             |
| `employees`             | organization and branch  | Person whose production work is recorded; no login       |
| `suppliers`             | organization             | Provider referenced by purchases; no login               |
| `measurement_units`     | organization             | Configurable unit code, name and active flag             |
| `product_categories`    | organization             | Catalog grouping with a name and active flag             |
| `products`              | organization             | Category, raw/processed kind and inventory/sales units   |
| `product_presentations` | organization and product | Presentation name and configured average weight in grams |
| `users`                 | organization             | Email, password hash, role and active flag               |
| `sessions`              | organization and user    | Hashed opaque token, issue/expiry and revocation         |

Branch, employee, supplier and catalog tables carry `organization_id`.
Employees also carry `branch_id`; suppliers and catalog master data are
organization-wide (TD-009, TD-013) because branches own stock and purchases, not
private supplier or catalog copies. Every operational table must carry both
`organization_id` and `branch_id` (ADR 0039). Products carry a required `kind`
(`RAW` or `PROCESSED`; PostgreSQL enum and SQLite `CHECK`) and presentations carry
a non-null `average_weight_grams`, validated as a positive integer by the domain
(TD-010).

## Migrations

```
database/migrations/          PostgreSQL migrations + journal
database/migrations-sqlite/   SQLite migrations + journal
```

Both journals currently contain six entries, `0000` through `0005`; `0002` adds
branches and the catalog, `0003` adds product kind and average weight, `0004`
adds employees with organization and branch references, and `0005` adds
organization-wide suppliers. M2-T4 did not change the schema: the catalog tables
already carry the organization and product ownership and the unique constraints
used by category names, unit codes and per-product presentation names.
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

`database/development-data.ts` contains the fixed organization id and development
users. `database/seed.ts` writes the organization and users using the same
password hashing implementation the API uses. Branches, employees, suppliers and
catalog rows are not seeded yet; branch creation waits on the three branch names
(BQ-19) and employee and supplier creation wait on real master data.

Development users:

| Email                    | Role            |
| ------------------------ | --------------- |
| `admin@inventory.test`   | `ADMINISTRATOR` |
| `manager@inventory.test` | `MANAGER`       |
| `staff@inventory.test`   | `STAFF`         |

The development password is `inventory-dev` and is not a production secret.
No branch, employee, supplier, category, unit, product or presentation seed has
been added; catalog values are real business master data that has not been
confirmed.

## Rules

- No database access from React or Tauri.
- No Drizzle imports in the domain.
- Repository methods exist twice, once per engine.
- A schema change updates both schema trees and both migration journals.
- `pnpm run guard:boundaries` compares the declared table sets and journal entry
  counts so a one-engine change fails the guard.
- IDs are UUID strings; timestamps are ISO instants.
