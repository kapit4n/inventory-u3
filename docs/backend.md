# Backend

`apps/api` is a Fastify 5 REST API written in TypeScript. It owns every database
access path.

## Startup

`apps/api/src/main.ts` builds the application, validates environment variables,
connects the configured engine and starts listening. `apps/api/src/app.ts` wires
plugins and routes.

## Configuration

`apps/api/src/config/env.ts` validates:

- `NODE_ENV`, `API_PORT`, `HOST`
- `DATABASE_URL`
- `ORGANIZATION_ID`
- session TTL and login-rate-limit settings
- allowed CORS origins

Secrets are read from the environment and never logged.

## Endpoints

| Method | Path                                                        | Permission            |
| ------ | ----------------------------------------------------------- | --------------------- |
| GET    | `/health`                                                   | public                |
| POST   | `/api/v1/auth/login`                                        | public                |
| POST   | `/api/v1/auth/logout`                                       | authenticated         |
| GET    | `/api/v1/auth/me`                                           | authenticated         |
| GET    | `/api/v1/auth/dev-users`                                    | non-production only   |
| POST   | `/api/v1/auth/dev-login`                                    | non-production only   |
| GET    | `/api/v1/organization`                                      | `organization:read`   |
| PUT    | `/api/v1/organization`                                      | `organization:manage` |
| GET    | `/api/v1/branches`                                          | `organization:read`   |
| POST   | `/api/v1/branches`                                          | `organization:manage` |
| PUT    | `/api/v1/branches/:branchId`                                | `organization:manage` |
| GET    | `/api/v1/employees`                                         | `organization:read`   |
| POST   | `/api/v1/employees`                                         | `organization:manage` |
| PUT    | `/api/v1/employees/:employeeId`                             | `organization:manage` |
| GET    | `/api/v1/suppliers`                                         | `organization:read`   |
| POST   | `/api/v1/suppliers`                                         | `organization:manage` |
| PUT    | `/api/v1/suppliers/:supplierId`                             | `organization:manage` |
| GET    | `/api/v1/product-categories`                                | `organization:read`   |
| POST   | `/api/v1/product-categories`                                | `organization:manage` |
| PUT    | `/api/v1/product-categories/:categoryId`                    | `organization:manage` |
| GET    | `/api/v1/measurement-units`                                 | `organization:read`   |
| POST   | `/api/v1/measurement-units`                                 | `organization:manage` |
| PUT    | `/api/v1/measurement-units/:measurementUnitId`              | `organization:manage` |
| GET    | `/api/v1/products`                                          | `organization:read`   |
| POST   | `/api/v1/products`                                          | `organization:manage` |
| PUT    | `/api/v1/products/:productId`                               | `organization:manage` |
| GET    | `/api/v1/products/:productId/presentations`                 | `organization:read`   |
| POST   | `/api/v1/products/:productId/presentations`                 | `organization:manage` |
| PUT    | `/api/v1/products/:productId/presentations/:presentationId` | `organization:manage` |
| GET    | `/api/v1/products/:productId/prices`                        | `organization:read`   |
| POST   | `/api/v1/products/:productId/prices`                        | `organization:manage` |
| GET    | `/api/v1/purchases`                                         | `inventory:read`      |
| GET    | `/api/v1/purchases/:purchaseId`                             | `inventory:read`      |
| POST   | `/api/v1/purchases`                                         | `inventory:write`     |
| POST   | `/api/v1/purchases/:purchaseId/receive`                     | `inventory:write`     |
| POST   | `/api/v1/purchases/:purchaseId/cancel`                      | `inventory:write`     |
| GET    | `/api/v1/purchases/:purchaseId/correction`                  | `inventory:read`      |
| POST   | `/api/v1/purchases/:purchaseId/correct`                     | `inventory:write`     |

Branch, employee, supplier, category, unit and product routes are implemented
with create, list and edit; there is no delete endpoint because all of them are
deactivated. Employee creation and update validate that the assigned branch
belongs to the caller's organization. Suppliers, categories, units and products
are organization-wide and have no branch assignment. Product create/update
validate that the category and every referenced unit belong to the caller's
organization. Presentation create/list/update is nested under a product, requires
the product to belong to the caller's organization, and checks that the
presentation belongs to that product. The product screen hosts the presentation
editor for processed products (TD-015). Price create/list is nested under a
product, verifies product ownership, derives basis from the product kind and
currency from the organization, rejects duplicate effective dates as a domain
conflict, and exposes no update or delete route (TD-016). Purchase creation
validates branch, supplier, organization, every product and the product inventory
unit, then stores a `DRAFT` with immutable lines and captured organization
currency. Receiving, cancellation and correction run through transactional use
cases in `apps/api/src/application/purchase/`; receiving is a one-shot
`DRAFT -> RECEIVED` transition with one stock movement per line, and correction
is an audited full reversal (TD-017). The purchase list accepts an optional
`branchId` filter. Inventory routes expose derived branch balances, product
movement history, manual adjustments, waste and reconciliation; all reads are
branch-scoped and negative balances are refused (ADR 0041).

The branch, employee, supplier, category, unit, product and purchase collections
return `{ "items": [...] }`. Product prices return
`{ "items": [...], "currency": "USD" }` so the create form knows the current
organization currency. Duplicate branch names, category names, unit codes and
per-product presentation names return a `DOMAIN_RULE_VIOLATION` problem rather
than a database error. Employee full names, supplier names and product names are
not unique.

## Request pipeline

1. Fastify parses the request.
2. The auth plugin resolves the bearer session and sets the principal and
   organization scope.
3. The route validates the body with a Zod schema.
4. A domain use case or rule runs.
5. Repositories persist through the configured engine.
6. The route returns JSON or the standard problem envelope.

## Logging

Logging is structured JSON. Request IDs and user IDs are included where safe.
Passwords, hashes and tokens are redacted. Log messages are generic application
events, not dental or inventory-specific prose.

## Database engines

`DATABASE_URL` chooses SQLite or PostgreSQL. Repository implementations exist for
both. SQLite is the default; PostgreSQL integration tests run only when a test
database URL answers.

Implemented repository ports: organization, branch, employee, supplier,
measurement unit, product category, product, product presentation, product price
history, purchase, purchase correction, stock movement, stock adjustment,
inventory waste, user and session. The branch, employee, supplier, catalog,
product, purchase, correction, movement, adjustment and waste ports are
exercised through integration tests on both engines. Stock balances are derived
from movements; no balance cache repository exists (ADR 0041). Inventory routes
cover balances, movement history, adjustments, waste and reconciliation.

## Testing

API unit tests cover configuration, problem mapping and authentication.
Integration tests cover authentication, branch, employee, supplier, category,
unit, product, presentation and product-price route permissions and validation,
the organization plus branch, employee, supplier, catalog, product and price
repository round-trips on SQLite, cross-organization isolation, repository
constraints and a migration smoke path. The same integration files run against
PostgreSQL when `TEST_DATABASE_URL` answers and skip otherwise. Domain and
validation tests cover their invariants. Component tests cover branch, employee,
supplier, category, unit, product, presentation, price-history, purchase and
branch-inventory management; browser tests mock the API through Playwright.
