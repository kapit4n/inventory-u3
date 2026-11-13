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
| GET    | `/api/v1/products/:productId/presentations`                 | `organization:read`   |
| POST   | `/api/v1/products/:productId/presentations`                 | `organization:manage` |
| PUT    | `/api/v1/products/:productId/presentations/:presentationId` | `organization:manage` |

Branch, employee, supplier, category and unit routes are implemented with create,
list and edit; there is no delete endpoint because all five are deactivated.
Employee creation and update validate that the assigned branch belongs to the
caller's organization. Suppliers, categories and units are organization-wide and
have no branch assignment. Presentation create/list/update is nested under a
product, requires the product to belong to the caller's organization, and checks
that the presentation belongs to that product. Presentation UI is deferred to the
M2-T5 product screen (TD-014). Inventory endpoints are intentionally absent until
their milestone.

The branch, employee, supplier, category and unit collections return
`{ "items": [...] }`. Duplicate branch names, category names, unit codes and
per-product presentation names return a `DOMAIN_RULE_VIOLATION` problem rather
than a database error. Employee full names and supplier names are not unique.

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
measurement unit, product category, product, product presentation, user and
session. The branch, employee, supplier and catalog ports are exercised through
integration tests on both engines. Stock remains a domain vocabulary only; no
stock repository exists.

## Testing

API unit tests cover configuration, problem mapping and authentication.
Integration tests cover authentication, branch, employee, supplier, category,
unit and presentation route permissions and validation, the organization plus
branch, employee, supplier and catalog repository round-trips on SQLite,
cross-organization isolation, repository constraints and a migration smoke path.
The same integration files run against PostgreSQL when `TEST_DATABASE_URL`
answers and skip otherwise. Domain and validation tests cover their invariants.
Component tests cover branch, employee, supplier, category and unit management;
browser tests mock the API through Playwright.
