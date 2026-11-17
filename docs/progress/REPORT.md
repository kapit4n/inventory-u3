# Inventory U3 — Phase 1 Business Foundation Report

> Last updated: 2026-11-17. Milestones M1–M8 are committed, with M8 at
> `9099246` and its closeout documentation at `62c6ad6`. M9 hardening is next.
> Canonical status lives in
> [IMPLEMENTATION_PROGRESS.md](../development/IMPLEMENTATION_PROGRESS.md).

## 1. Architecture overview

One React application, two deployment shells, one REST API and two explicit
database engines. The domain is framework-independent, application workflows own
business orchestration, and the API owns all database access. SQLite runs
everything by default; PostgreSQL remains the second engine with matching
schemas, migrations and repository implementations.

## 2. Repository structure

`apps/api`, `apps/web` and `apps/desktop`; shared packages for app, UI, domain,
validation, types, API client, config and TypeScript; dual database schema and
migration trees plus seed data; Playwright specs; and the durable documentation
set under `docs/`.

## 3. Package dependency graph

Presentation (`apps/web`, `apps/desktop`, `packages/app`, `packages/ui`) depends
inward on the domain. Infrastructure (`apps/api`, Drizzle repositories, REST
transport) implements domain ports. There are no circular package dependencies;
`pnpm run guard:boundaries` passes dependency, database-access, thin-shell,
domain-purity, schema-parity and migration-parity checks.

## 4. Domain boundaries

Implemented areas include organization, user, role, session, permissions,
organization settings, branch, employee, supplier, product catalog, price
history, purchase, stock movement, derived stock balance, stock adjustment,
inventory waste, production, sales checkpoint, daily closing and reporting.
Business rules are pure TypeScript. No React, Drizzle, database driver, Tauri or
browser API is imported by `packages/domain`. Balances derive from the append-only
ledger; closing snapshots and confirmed checkpoints/batches are immutable.

## 5. Web/Desktop strategy

Both shells mount the shared `packages/app` entry point and declare only their
runtime target. Tauri capabilities are exposed through the platform contract;
React code does not call Tauri APIs directly. CSV export is generated in the app
and saved through `usePlatform().saveFile`, so the same dashboard works on web and
desktop.

## 6. API architecture

Fastify uses Zod validation at every boundary, opaque bearer authentication,
domain use cases, repository ports, standard problem envelopes and structured
redacted logs. Master-data reads use `organization:read` and writes use
`organization:manage`. Operational reads use `inventory:read` and writes use
`inventory:write`. Reports require `reports:read`; malformed report queries
return HTTP 422. Receiving, production, sales, closing and report flows are
application use cases behind authenticated routes.

## 7. Database architecture

SQLite is the default engine; PostgreSQL is retained as the second engine. Both
have schema trees, generated migrations and repository implementations. Current
tables include branches, employees, suppliers, catalog and price history,
purchases, production, stock movements, adjustments, waste, sales checkpoints,
daily closings and supporting items/corrections. Movement quantities are exact
integer thousandths. M8 added no report tables, views or migrations; reports read
existing source tables through one port implemented twice. Local SQLite migrations
are applied through `0012`.

## 8. State-management strategy

TanStack Query owns server state, including report queries. Forms use React Hook
Form with Zod validation; local UI state stays in components or small
feature-scoped stores. There is no global API-data store and no giant Zustand
store.

## 9. Testing strategy

Vitest covers domain rules, REST-client behavior, API route integration,
dual-engine repository behavior and React components with React Testing Library.
SQLite integration tests run locally; PostgreSQL cases skip without a reachable
server (SI-06). Playwright covers the shell, settings, master data, products,
purchases, inventory, production, sales checkpoints, daily closings and dashboard
reports. Latest results: 437 passed and 13 skipped in default suites, 109 passed
and 13 skipped in the SQLite integration command, and 48 Chromium tests.
Typecheck, lint, boundary guard, build and formatting pass; lint has one
pre-existing React Compiler warning for React Hook Form `watch()`.

## 10. What was actually implemented

The technical foundation is complete. M1–M2 established branch-aware master data,
products, presentations, average weights and effective-dated prices. M3 added
multi-line supplier purchases, receiving and audited reversal. M4 added derived
stock balances, adjustments, waste and reconciliation. M5 added production batches
with snapshots and ledger posting. M6 added aggregate sales checkpoints with
weight/price snapshots and audited reversal. M7 added versioned daily closings,
latest-purchase costing, warnings and reopening. M8 replaced the static dashboard
with on-demand consolidated reports: branch/date/granularity filters, day/week/
month periods, estimated profit, sales/purchase/production/inventory/waste
sections and localized CSV export (ADR 0045, TD-022).

## 11. What was intentionally NOT implemented

No WhatsApp integration or final BR-013 field contract. No configurable periods
(BQ-02), unit conversion (BQ-10), tax/freight cost treatment (BQ-14), branch
timezones (BQ-16) or no-sales marker (BQ-17). No branch-user assignment or
branch-scoped authorization yet (BQ-09). No report snapshot tables, materialized
views or server-generated CSV. No offline synchronization, GraphQL, Redux,
microservices, third database or hidden abstraction over the two engines.

## 12. Open architectural questions

How branch-scoped access should work (BQ-09) is the main M9 input. Reporting
semantics remain provisional while BR-013 and BQ-02/BQ-10/BQ-14/BQ-16/BQ-17 are
open. Report-query performance targets and whether indexes or materialization are
needed remain to be measured. CI, backup/restore and release procedures still need
operational execution, not just documentation.

## 13. Recommended next milestone

Start M9 — Quality, Permissions and Operational Hardening. Ask for BQ-09 input
before branch access work; independently plan critical-rule test expansion, audit
review, backup/restore drills, performance measurement, CI and release
documentation. Do not mark M9 complete until those checks have actually run.
