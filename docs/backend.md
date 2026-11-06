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

| Method | Path                     | Permission            |
| ------ | ------------------------ | --------------------- |
| GET    | `/health`                | public                |
| POST   | `/api/v1/auth/login`     | public                |
| POST   | `/api/v1/auth/logout`    | authenticated         |
| GET    | `/api/v1/auth/me`        | authenticated         |
| GET    | `/api/v1/auth/dev-users` | non-production only   |
| POST   | `/api/v1/auth/dev-login` | non-production only   |
| GET    | `/api/v1/organization`   | `organization:read`   |
| PUT    | `/api/v1/organization`   | `organization:manage` |

Inventory endpoints are intentionally absent until their milestone.

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

## Testing

API tests cover configuration, problem mapping, authentication integration and a
SQLite smoke path. Domain and validation tests cover rules. Browser tests mock the
API through Playwright.
