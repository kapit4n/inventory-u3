# Inventory U3 — Roadmap

Each milestone ends with a working, verifiable increment. Phase 1 is the current
phase and stops at the foundation.

---

## Milestone 1 — FOUNDATION (current)

Architecture documentation, ADRs, monorepo, tooling, minimal runnable
web/desktop/API, database foundation, test foundation.

**Done when**

- [x] Architecture, domain, frontend, backend, database, desktop, testing docs
- [x] ADRs for monorepo, desktop shell, domain boundaries, REST, state, shared app
- [x] pnpm + Turborepo workspace installs and builds cleanly
- [x] TypeScript strict, ESLint flat config, Prettier
- [x] Boundary guard (`pnpm run guard:boundaries`) passing
- [x] `packages/{tsconfig,types,config,validation,domain,api-client,ui,app}`
- [x] `apps/api` boots, validates env with Zod, structured logs, `/health`
- [x] `apps/web` and `apps/desktop` render the shared application
- [x] SQLite default database; PostgreSQL second engine; Drizzle migrations; seeds
- [x] Vitest + RTL + Playwright foundations
- [x] `typecheck`, `lint`, `format:check`, `test`, `build`, `test:e2e` green

**Explicitly excluded:** inventory business features and offline mode.

---

## Milestone 2 — INVENTORY CATALOG

The first business slice: items and the classifications used to find them.

- Item categories and units of measure
- Item list with search, filters and pagination
- Item create/edit form with SKU, name, description, unit and reorder point
- Item detail page
- Organization-scoped repository methods on SQLite and PostgreSQL
- API validation and problem responses
- Unit, integration and browser coverage

**Exit criteria:** an operator can create, find and edit items; every write is
organization-scoped; no stock accounting yet.

---

## Milestone 3 — STOCK MOVEMENTS

- Receiving, issuing, adjustment and transfer records
- Append-only movement history
- Current stock level derived from movements or a maintained cache
- Insufficient-stock and invalid-adjustment rules in the domain
- Item detail movement timeline
- SQLite and PostgreSQL transaction coverage

**Exit criteria:** every stock change is traceable to a movement and a user.

---

## Milestone 4 — OPERATIONS AND REPORTING

- Low-stock and reorder views
- Dashboard summary cards
- Saved filters or report definitions
- CSV export
- Organization settings polish and user administration
- Desktop packaging and update strategy

**Exit criteria:** the daily stock questions are answerable from the application
without ad-hoc database queries.

---

## Milestone 5 — HARDENING

- PostgreSQL backup/restore guidance
- Error monitoring and log shipping
- Performance tuning for large movement histories
- Security and data-handling review
- Desktop release verification on supported platforms

---

## Explicitly out of scope for now

- Offline mode, local desktop database and synchronization
- A third database engine
- Microservices, GraphQL and Redux
- Inventing product requirements ahead of the next milestone
