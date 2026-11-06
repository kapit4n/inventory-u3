# Database

Inventory U3 uses Drizzle ORM with two explicit engines:

- **SQLite** for the default local and product workflow
- **PostgreSQL** retained as the second engine

There is no third engine and no abstraction layer over the two (ADR 0025).

## Schema

```
database/schema/
  enums.ts
  organization.ts
  index.ts
  sqlite/
    organization.ts
    enums / defaults / checks
    index.ts
```

The foundation has three tables:

| Table           | Purpose                                      |
| --------------- | -------------------------------------------- |
| `organizations` | Tenant identity: name, timezone, currency    |
| `users`         | Organization-scoped users with role and hash |
| `sessions`      | Hashed opaque tokens and expiry              |

Inventory tables are added with that milestone, never guessed in advance.

## Migrations

```
database/migrations/          PostgreSQL migrations + journal
database/migrations-sqlite/   SQLite migrations + journal
```

Generate both when the schema changes:

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

## Seed data

`database/development-data.ts` contains the fixed organization id and development
users. `database/seed.ts` writes the organization and users using the same
password hashing implementation the API uses.

Development users:

| Email                    | Role            |
| ------------------------ | --------------- |
| `admin@inventory.test`   | `ADMINISTRATOR` |
| `manager@inventory.test` | `MANAGER`       |
| `staff@inventory.test`   | `STAFF`         |

The development password is `inventory-dev` and is not a production secret.

## Rules

- No database access from React or Tauri.
- No Drizzle imports in the domain.
- Repository methods exist twice, once per engine.
- A schema change updates both schema trees and both migration journals.
- IDs are UUID strings; timestamps are ISO instants.
