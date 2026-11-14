# Inventory U3 — Phase 1 Business Foundation Report

> Last updated: 2026-11-13. M1 is committed at `bfdc9cb`, M2-T1 at `814f397`,
> M2-T2 at `6b50606`, M2-T3 at `5c96eeb`, M2-T4 at `992d6ea`, M2-T5 at
> `c8526d0` and M2-T6/T7 with the sample seed at `cc70bfc`.

## 1. Architecture overview

One React application, two deployment shells, one REST API and two explicit
database engines. The domain is framework-independent, application workflows
own business orchestration, and the API owns all database access. SQLite runs
everything by default; PostgreSQL remains the second engine with matching
schemas, migrations and repository implementations.

## 2. Repository structure

`apps/api`, `apps/web`, `apps/desktop`; shared packages for app, UI, domain,
validation, types, API client, config and TypeScript; dual database schema and
migration trees plus seed data; E2E; and the durable documentation set under
`docs/`.

## 3. Package dependency graph

Presentation (`apps/web`, `apps/desktop`, `packages/app`, `packages/ui`) depends
inward on the domain. Infrastructure (`apps/api`, Drizzle repositories, REST
transport) implements domain ports. There are no circular package dependencies;
`pnpm run guard:boundaries` passes dependency, database-access, thin-shell,
domain-purity, schema-parity and migration-parity checks.

## 4. Domain boundaries

Implemented domain areas are organization, user, role, session, permissions,
organization settings, branch, employee, supplier, product catalog, price
history, stock movement concepts, errors, time and identifiers. Branch, employee,
supplier, catalog, product and price-history data are persisted through both
engines and exposed through API and UI. Stock concepts remain domain-only. No inventory balance,
purchase, production, sales checkpoint or closing entity is implemented.

## 5. Web/Desktop strategy

Both shells mount the shared `packages/app` entry point and declare only their
runtime target. Tauri capabilities are exposed through the platform contract;
React code does not call Tauri APIs directly. Business screens are shared
unchanged between web and desktop.

## 6. API architecture

Fastify with Zod validation at every boundary, opaque bearer authentication,
domain use cases, repository ports, standard problem envelopes and structured
redacted logs. Branch, employee, supplier, category, unit, product, presentation
and price routes are authenticated; writes require the administrator-only
`organization:manage` permission and reads require `organization:read`. Employee assignments are
validated against a branch in the caller's organization; suppliers, categories,
units and products are organization-wide. Product references are validated
against the caller's organization, and presentations and prices are nested under
a product and verify product ownership. Price rows derive basis from product kind
and currency from the organization and reject duplicate effective dates.

## 7. Database architecture

SQLite is the default engine; PostgreSQL is retained as the second engine. Both
have schema trees, generated migrations and repository implementations. Current
tables are organizations, branches, employees, suppliers, measurement units,
product categories, products, product presentations, product price history, users
and sessions. SQLite migrations are applied through `0006`; seed data contains
only the development organization and users because real master data is not
confirmed.

## 8. State-management strategy

TanStack Query owns server state. Forms use React Hook Form with Zod validation;
local UI state stays in components or small feature-scoped stores. There is no
global API-data store and no giant Zustand store.

## 9. Testing strategy

Vitest covers domain rules, REST-client behavior, API route integration,
dual-engine repository behavior and React components with React Testing Library.
SQLite integration tests run by default; PostgreSQL cases skip without a
reachable server. Playwright now covers shell, settings, master-data management,
products, presentations and price history. The default suites report 292 passed
and 10 skipped; the separately invoked SQLite integration command reports 69
passed and 10 skipped; the Chromium E2E suite reports 29 passed. Typecheck, lint,
build and formatting pass.

## 10. What was actually implemented

The technical foundation is complete: monorepo and guardrails, auth/session,
organization settings, dual-engine persistence, shared web/desktop shells,
bilingual UI and the verification pipeline. M1 closeout documented the existing
domain and architecture. M2-T1 added branch list/create/edit, permissions,
migrations, repositories, REST client, Settings UI and an active-branch selector.
M2-T2 added employee master data with organization and branch ownership,
create/list/edit, deactivation instead of deletion, dual-engine migrations and
repositories, authenticated routes, typed client, Settings UI and tests. Employee
assignment assumes one branch per employee pending BQ-20 (TD-012). M2-T3 added
organization-wide supplier master data with create/list/edit, deactivation
instead of deletion, non-unique names, dual-engine migrations and repositories,
authenticated routes, typed client, Settings UI and tests (TD-013). Supplier
contact, tax and payment fields remain open (BQ-21). M2-T4 added category, unit
and presentation update rules, organization-scoped unique lookups, catalog
validation, category/unit/nested-presentation routes, typed client functions,
Settings category and unit management and tests. M2-T5 added product update and
organization-scoped reference validation, both-engine product repositories,
product routes and typed client, the dedicated `/products` screen and the
presentation editor for processed products (TD-015). M2-T6 added the
`ProductPriceHistory` entity, append-only dual-engine table and repositories,
validation, authenticated product-nested price routes, typed client, and the
`/products` price-history dialog and create form (TD-016). M2-T7 added Playwright
coverage for master-data create/edit, the duplicate-name problem, read-only
non-administrator views, product create/edit, tray presentations and
effective-dated prices, completing M2. The sample seed adds an illustrative
fruit-and-vegetable catalogue on both engines.

## 11. What was intentionally NOT implemented

Employee login accounts, branch-scoped authorization, payroll, attendance,
contact or identity data, supplier contact/tax/payment fields, branch-scoped or
purchase prices, price update/delete and correction audit, weight snapshots,
recipe/bill-of-materials entities (BQ-11 defers production inputs to M5),
purchases, receiving, stock tables and balances, production, sales checkpoints,
daily closing, reporting, offline mode, desktop-local data, synchronization,
microservices, GraphQL and Redux.

## 12. Open architectural questions

See `docs/open-questions.md`. Key questions include employee sharing across
branches (BQ-20), supplier detail fields (BQ-21), real branch seeding (BQ-19),
price scope (BQ-06), units and conversions (BQ-10), the physical stock model,
movement-derived versus cached levels, negative stock policy, multi-organization
membership, reporting valuation and the WhatsApp report format that blocks M6
(BR-013).

## 13. Recommended next milestone

Start **M3 — Supplier Purchases and Receiving** with the purchase and
purchase-item domain entities and states. M2 is committed as `cc70bfc`.
