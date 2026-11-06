# Inventory U3 — Foundation Report

## 1. Architecture overview

One React application, two deployment shells, one REST API and two explicit
database engines. The domain is framework-independent and the API owns all
database access.

## 2. Repository structure

`apps/api`, `apps/web`, `apps/desktop`; shared packages for app, UI, domain,
validation, types, API client, config and TypeScript; database schemas,
migrations, seed; E2E; docs.

## 3. Package dependency graph

Presentation -> application -> domain. Infrastructure implements domain ports.
No circular package dependencies; the boundary guard passes.

## 4. Domain boundaries

Organization, user, role, session, permissions, errors, time and identifier
primitives. Inventory entities are deliberately not modeled yet.

## 5. Web/Desktop strategy

Both shells mount the shared `packages/app` entry point. The shell declares a
runtime target. Desktop capabilities are exposed through the platform contract.

## 6. API architecture

Fastify with Zod validation, opaque bearer authentication, domain use cases,
repository ports, standard problem envelopes and structured redacted logs.

## 7. Database architecture

SQLite is the default engine; PostgreSQL is retained. Both have schema trees,
migration journals and repository implementations. The foundation tables are
organizations, users and sessions.

## 8. State-management strategy

TanStack Query for server state. Component state or small Zustand stores for local
UI state. No global API-data store.

## 9. Testing strategy

Vitest domain/unit tests, API integration tests against SQLite, React Testing
Library component tests, and Playwright browser tests with a mocked API.

## 10. What was actually implemented

The generic organization/user/session foundation, auth and organization settings
API, minimal schemas and migrations, seed data, shared shell, dashboard,
inventory placeholder, settings form, bilingual catalogue, and the full
verification pipeline.

## 11. What was intentionally NOT implemented

Inventory CRUD, stock movements, reporting, purchasing, offline mode, local
desktop database, synchronization, microservices, GraphQL and Redux.

## 12. Open architectural questions

See `docs/open-questions.md`: physical stock model, units and conversions,
movement-derived versus cached levels, negative stock policy, multi-organization
membership, and reporting valuation.

## 13. Recommended next milestone

**Milestone 2 — Inventory Catalog.** Start with items, categories, units and
organization-scoped read/write paths across both engines.
