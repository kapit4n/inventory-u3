# Inventory U3 — Technical Architecture

> This document summarizes the architecture **actually present in the
> repository**. Detailed reference material remains in
> [architecture.md](../architecture.md), [frontend.md](../frontend.md),
> [backend.md](../backend.md), [database.md](../database.md),
> [desktop.md](../desktop.md), [testing.md](../testing.md) and
> [security.md](../security.md).

## 1. System shape

```text
apps/web (Vite)        apps/desktop (Tauri 2)
        \                    /
         \                  /
          packages/app (React application)
                    |
          packages/api-client (REST)
                    |
             apps/api (Fastify)
                    |
        packages/domain (pure TypeScript)
                    |
       domain ports (repositories)
             /            \
   SQLite repos        PostgreSQL repos
        |                   |
   data/*.db          PostgreSQL server
```

One REST API owns every database access. Neither the browser nor the Tauri window
opens a database. The desktop shell is a deployment target, not a second
application.

## 2. Layers and dependency direction

| Layer          | Location                                                          | Rule                                                    |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Presentation   | `apps/web`, `apps/desktop`, `packages/app`, `packages/ui`         | May call application features and the API client        |
| Application    | feature queries/mutations in `packages/app`; routes in `apps/api` | Orchestrates domain rules; no persistence in components |
| Domain         | `packages/domain`                                                 | Pure TypeScript; no React, Drizzle, SQL, HTTP or Tauri  |
| Infrastructure | `apps/api/src/infrastructure`, Drizzle repositories               | Implements domain ports; may use engines and crypto     |

The automated guard `pnpm run guard:boundaries` enforces the forbidden-import
rules. The dependency direction is inward only.

## 3. Packages

| Package               | Responsibility                                                       | Status                                        |
| --------------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| `packages/domain`     | Organization, branch, auth/session rules, roles, errors, time, ports | Implemented                                   |
| `packages/validation` | Zod schemas for auth, organization, env and common primitives        | Implemented                                   |
| `packages/types`      | Branded IDs, ISO time, money minor units                             | Implemented                                   |
| `packages/api-client` | Typed REST client: headers, query strings, problem mapping, schemas  | Implemented                                   |
| `packages/app`        | THE shared React application: routes, providers, features, i18n      | Implemented foundation; placeholder inventory |
| `packages/ui`         | Design tokens and reusable UI primitives                             | Implemented                                   |
| `packages/config`     | Shared ESLint, Vitest, Tailwind and TypeScript configuration         | Implemented                                   |
| `packages/tsconfig`   | Base TypeScript configurations                                       | Implemented                                   |
| `apps/api`            | Fastify REST API and persistence                                     | Implemented foundation                        |
| `apps/web`            | Browser shell: mounts `packages/app`                                 | Implemented                                   |
| `apps/desktop`        | Tauri 2 shell: mounts `packages/app`                                 | Implemented                                   |
| `database`            | Dual-engine schema, migrations, seed and URL resolution              | Implemented foundation                        |
| `e2e`                 | Playwright browser tests                                             | Implemented foundation                        |

## 4. Runtime flow

```text
React feature component
  -> feature query/mutation (TanStack Query)
  -> ApiClient (packages/api-client)
  -> Fastify route (apps/api)
  -> Zod request validation
  -> domain use case / rule (packages/domain)
  -> repository port
  -> SQLite or PostgreSQL repository
  -> response JSON / standard problem envelope
```

- Request validation uses the same Zod schemas the UI can use.
- Domain failures carry stable codes; the API maps them to HTTP status and one
  error envelope with a `requestId`.
- Responses are validated against schemas where the client supplies one.

## 5. Authentication and authorization

Implemented:

- Email/password login; scrypt password hashing.
- Opaque random bearer tokens; only the token hash is stored.
- Sessions scoped to one organization and one active user; logout revokes.
- Auth plugin resolves the principal on every protected route and fails closed.
- Role permissions are domain values: `organization:read`, `organization:manage`,
  `users:read`, `users:manage`, `inventory:read`, `inventory:write`,
  `reports:read`.
- Login attempts are limited in process.
- Development login-as routes exist only outside production.

Not implemented:

- Business roles for owner/central operator/branch employee.
- Branch-scoped user authorization (`UserBranchAssignment`).
- User administration endpoints.
- Password reset, MFA or account lifecycle management.

## 6. Persistence

SQLite is the default engine. PostgreSQL is retained as an explicit second
engine (ADR 0025).

- Schemas: `database/schema/` (PostgreSQL) and `database/schema/sqlite/`.
- Migrations: `database/migrations/` and `database/migrations-sqlite/`.
- A schema change must land in both trees and both journals.
- Repository methods are written twice, once per engine.
- `database/db-url.ts` chooses the engine from `DATABASE_URL` and resolves
  SQLite paths against the repository root.
- Current tables: `organizations`, `branches`, `users`, `sessions`.

The `branches` table is organization-owned and implemented on both engines.
Product, stock, production and sales tables do not exist yet. When they are
added, every operational row must carry organization and branch ownership.

## 7. Frontend architecture

- `packages/app` owns routes, providers, shell, features and i18n.
- `apps/web` and `apps/desktop` only mount the shared app.
- TanStack Router owns routing; the route tree is generated.
- TanStack Query owns server state; there is no global API-data store.
- React Hook Form + Zod own forms.
- A typed English/Spanish catalogue owns user-facing copy.
- The platform abstraction (`packages/app/src/platform`) hides Tauri/OS
  capabilities. Features never import Tauri.
- Current routes: `/` (redirect), `/dashboard`, `/inventory` (placeholder),
  `/settings`.
- There are no purchase, production, sales checkpoint, closing or report screens.

## 8. Desktop

Tauri 2 hosts the same React build. The shell has its own Vite entry and Rust
host, and the app uses memory history on desktop. No feature imports Tauri. The
desktop shell does not open a database; it talks to the API over HTTP.

## 9. Testing architecture

| Layer            | Tooling                 | Location                         |
| ---------------- | ----------------------- | -------------------------------- |
| Domain/utilities | Vitest                  | colocated `*.test.ts`            |
| API units        | Vitest                  | `apps/api/src/**/*.test.ts`      |
| API integration  | Vitest + real SQLite    | `apps/api/test/*.integration.ts` |
| React components | Vitest + RTL + jsdom    | `packages/app/src/**/*.test.tsx` |
| Browser E2E      | Playwright + mocked API | `e2e/web/*.spec.ts`              |

PostgreSQL integration tests require `TEST_DATABASE_URL` and are skipped on this
machine because no PostgreSQL server is available.

## 10. Guardrails and quality gates

- TypeScript strict everywhere.
- ESLint flat config; Prettier.
- Boundary guard for dependency-direction violations.
- Zod at every external boundary.
- No business logic or database access in React components.
- No Drizzle/React/Tauri/browser APIs in the domain.
- Significant decisions are recorded as ADRs or in
  [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md).

## 11. Architecture gaps for the business milestones

The existing foundation is reusable. The branch entity and its dual-engine
persistence now exist; the following are not designed or built:

1. Branch API routes and management UI (the entity and repositories exist).
2. Product/category/unit/presentation/price-history schema on both engines.
3. Stock ledger and balance strategy.
4. Purchase receiving and auditable correction model.
5. Production batch inputs/outputs and snapshot fields.
6. Aggregate sales checkpoint model and snapshot fields.
7. Daily closing aggregation and review state.
8. Consolidated reporting queries and dashboard.
9. Branch-aware authorization and audit history.
10. CI pipeline; there is currently no `.github/` workflow.

These gaps are sequenced in
[IMPLEMENTATION_ROADMAP.md](../development/IMPLEMENTATION_ROADMAP.md). Do not
implement them ahead of their milestone.
