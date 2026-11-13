# Inventory U3 — Project Overview

> Last verified: 2026-11-12. M1 is committed at `bfdc9cb`, M2-T1 at `814f397`,
> M2-T2 at `6b50606`, M2-T3 at `5c96eeb` and M2-T4 at `992d6ea`; M2-T5 product
> management is verified but uncommitted. See
> [IMPLEMENTATION_PROGRESS](../development/IMPLEMENTATION_PROGRESS.md).

## Purpose

Inventory U3 is an inventory management system for a fresh-produce business with
three independent branches. It is intended to consolidate, for the owner, what
each branch receives, prepares, sells, wastes and still has on hand each day.

The application is **not** a point-of-sale system in its first version. Branch
employees keep communicating through WhatsApp; one central operator records the
aggregated information in Inventory U3.

## Business problem

The business currently depends on WhatsApp messages from three branches. There is
no single, reliable record of daily purchases, production, sales checkpoints,
waste and remaining stock. The owner cannot compare branches or understand
estimated profitability without manually reconciling messages.

Inventory U3 must provide one branch-aware record, entered by a central operator,
that the owner can use to answer daily operational questions.

## Intended capabilities

The business requirements are documented in
[BUSINESS_REQUIREMENTS.md](./BUSINESS_REQUIREMENTS.md). At a high level the
product is expected to support:

- Branch master data and branch-independent inventory.
- Suppliers, employees, product categories, products and measurement units.
- Product presentations, average weight per tray and selling price per kilogram.
- Supplier purchases and confirmed receiving.
- Stock movements, adjustments, waste and reconciliation.
- Production batches with tray, estimated-weight and input snapshots.
- Morning and evening aggregate sales checkpoints.
- Daily closing with estimated revenue, cost and gross profit.
- Consolidated dashboards and reports for the owner.
- Audit history and, later, branch-specific access.

## Intended users

| User                         | Initial access      | Responsibility                                              |
| ---------------------------- | ------------------- | ----------------------------------------------------------- |
| Owner                        | Reports only, later | Reviews consolidated branch performance                     |
| Central operator             | Full application    | Enters purchases, production, sales checkpoints and closing |
| Branch employee              | None initially      | Prepares products; reports through WhatsApp                 |
| Future branch user / manager | Future milestone    | Enters or reviews their own branch's data                   |
| Administrator                | Full application    | Organization, users and settings                            |

The current implementation only has organization users with the roles
`ADMINISTRATOR`, `MANAGER` and `STAFF`. It does not yet distinguish the owner,
central operator or branch employee as business roles.

## Current implementation status

**The repository is a working technical foundation, not a working inventory
product.** As of this document:

- The monorepo, API, web shell, desktop shell, authentication, organization
  settings, SQLite/PostgreSQL persistence and test harness are implemented.
- Persisted tables are `organizations`, `branches`, `employees`, `suppliers`,
  `measurement_units`, `product_categories`, `products`,
  `product_presentations`, `users` and `sessions`.
- The `Branch`, `Employee`, `Supplier` and product-catalog domain entities and
  their SQLite/PostgreSQL repositories are implemented. Branch, employee,
  supplier, category and measurement-unit list/create/edit are available through
  the API and the Settings screen, with a reusable active-branch selector.
  Products use a dedicated `/products` screen for list/create/edit/deactivate,
  and processed products open the presentation editor from that screen. Products
  carry a required raw/processed kind and presentations carry an average weight
  per tray. Category, unit, product and product-nested presentation API routes
  and typed-client functions exist.
- The catalog has no prices or estimated/measured weight snapshots. Those are
  M2/M5/M6 work.
- The domain defines append-only stock movement concepts and a balance shape,
  but there is no stock table, repository, API or screen (ADR 0040).
- The `/inventory` screen is a placeholder.
- No purchase, stock, production, sales checkpoint, daily closing or report
  feature exists. Employees and suppliers are master data only; they do not log
  in.
- The initial access boundary is documented in
  [ACCESS_MODEL.md](./ACCESS_MODEL.md): one organization-wide central operator,
  no branch employee login, and no branch-scoped authorization yet.
- The nine business milestones are defined in
  [IMPLEMENTATION_ROADMAP.md](../development/IMPLEMENTATION_ROADMAP.md). M1 is
  complete: branch, product catalog, measurement configuration, stock concepts,
  the access note, technical docs and the dual-engine guard are done. M2 is in
  progress with branch, employee, supplier, category, measurement-unit, product
  and presentation management complete; the real branches are not seeded until
  BQ-19 is answered, employee sharing across branches remains open (BQ-20), and
  supplier detail fields remain open
  (BQ-21).

The inventory business model in this documentation is **proposed**. It separates
confirmed product requirements from proposed design and from open questions. Do
not treat a proposed table, route or workflow as implemented until the repository
proves it.

## Technology stack

| Area          | Technology                                                              |
| ------------- | ----------------------------------------------------------------------- |
| Monorepo      | pnpm 10 workspaces + Turborepo                                          |
| Language      | TypeScript 5.9, strict                                                  |
| Web UI        | React 19, Vite 8, TanStack Router, TanStack Query, React Hook Form, Zod |
| UI system     | Tailwind CSS v4, shadcn/ui-derived primitives, Lucide icons             |
| State         | TanStack Query for server state; local component state / small Zustand  |
| Desktop       | Tauri 2 (Rust) shell over the same web application                      |
| API           | Node.js 22, Fastify 5, Zod, structured Pino logging                     |
| Database      | SQLite by default, PostgreSQL as the second engine, Drizzle ORM         |
| Validation    | Zod schemas at every boundary                                           |
| Tests         | Vitest, React Testing Library, Playwright                               |
| Package scope | `@inventory-u3/*`                                                       |

## Key architectural decisions

The foundation decisions are recorded as ADRs in
[`docs/decisions/`](../decisions/README.md). The most important are:

- One React application package rendered by thin web and desktop shells
  (ADR 0008, ADR 0013).
- Framework-independent domain; no React, Drizzle or database driver in
  `packages/domain` (ADR 0004).
- REST over HTTP with Fastify; the API owns all database access (ADR 0005).
- Two explicit engines: SQLite runs the product, PostgreSQL is retained;
  both implement every repository method (ADR 0025).
- Opaque bearer sessions with hashed tokens (ADR 0028).
- TanStack Query for server state, Zustand for small local state (ADR 0007).

Product and business decisions that are not foundation architecture are recorded
in [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md).

## Repository origin

Inventory U3 was replicated from a mature dental application foundation. The
infrastructure was retained; the dental domain was removed. This history matters
when deciding whether existing code is intentional:

| Area                                                         | Disposition                                  |
| ------------------------------------------------------------ | -------------------------------------------- |
| Monorepo, tooling, boundary guard, test harness              | Retained                                     |
| SQLite + PostgreSQL strategy, Drizzle migrations             | Retained                                     |
| Organization, user, session, role and permission foundation  | Retained and renamed                         |
| API problem envelope, auth, config validation, logging       | Retained                                     |
| Shared React app, shells, UI primitives, i18n infrastructure | Retained                                     |
| Dental domain, routes, schemas, seed data, tests, ADRs       | Replaced or removed                          |
| Inventory business logic                                     | Never existed; this roadmap defines it       |
| Dependencies from the dental UI (FullCalendar, Luxon, etc.)  | Retained in `package.json`, currently unused |

See ADR 0038 and [KNOWN_ISSUES.md](../development/KNOWN_ISSUES.md) for the
unused-dependency debt.

## Install and run

Prerequisites: Node.js 22+, pnpm 10, and on this machine pnpm lives under
`~/.local/bin`. Docker is not required for the default SQLite workflow.

```bash
export PATH="$HOME/.local/bin:$PATH"

# One command: install, create .env, migrate, seed, start web + API
./scripts/start.sh
# or
pnpm start
```

Manual equivalent:

```bash
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
pnpm run dev:web      # http://localhost:5173
pnpm run dev:api      # http://localhost:3010
pnpm run dev:desktop  # Tauri window
```

The generated SQLite file is `data/inventory-u3.db` and is git-ignored. The seed
creates the development organization and three users; the development password is
`inventory-dev`.

## Tests and validation

```bash
pnpm run typecheck
pnpm run lint          # includes the architecture boundary guard
pnpm run test
pnpm run test:e2e      # Playwright; needs a built web app and Chromium
pnpm run format:check
pnpm run build
```

The latest verified results and the exact commands executed are recorded in
[IMPLEMENTATION_PROGRESS.md](../development/IMPLEMENTATION_PROGRESS.md) and
[SESSION_LOG.md](../development/SESSION_LOG.md). Do not copy an old result as if
it were current.

## Documentation map

### Project

- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)
- [BUSINESS_REQUIREMENTS.md](./BUSINESS_REQUIREMENTS.md)
- [BUSINESS_DOMAIN_MODEL.md](./BUSINESS_DOMAIN_MODEL.md)
- [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)
- [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md)
- [ACCESS_MODEL.md](./ACCESS_MODEL.md)

### Workflows

- [INVENTORY_WORKFLOW.md](../workflows/INVENTORY_WORKFLOW.md)
- [PURCHASE_WORKFLOW.md](../workflows/PURCHASE_WORKFLOW.md)
- [PRODUCTION_WORKFLOW.md](../workflows/PRODUCTION_WORKFLOW.md)
- [SALES_CHECKPOINT_WORKFLOW.md](../workflows/SALES_CHECKPOINT_WORKFLOW.md)
- [DAILY_CLOSING_WORKFLOW.md](../workflows/DAILY_CLOSING_WORKFLOW.md)
- [PRODUCT_MEASUREMENT_RULES.md](../workflows/PRODUCT_MEASUREMENT_RULES.md)

### Development

- [IMPLEMENTATION_ROADMAP.md](../development/IMPLEMENTATION_ROADMAP.md)
- [IMPLEMENTATION_PROGRESS.md](../development/IMPLEMENTATION_PROGRESS.md)
- [CURRENT_TASK.md](../development/CURRENT_TASK.md)
- [KNOWN_ISSUES.md](../development/KNOWN_ISSUES.md)
- [SESSION_LOG.md](../development/SESSION_LOG.md)

### Existing technical detail

- [architecture.md](../architecture.md)
- [domain.md](../domain.md)
- [frontend.md](../frontend.md)
- [backend.md](../backend.md)
- [database.md](../database.md)
- [desktop.md](../desktop.md)
- [testing.md](../testing.md)
- [security.md](../security.md)
- [open-questions.md](../open-questions.md)
- [decisions/](../decisions/README.md)
