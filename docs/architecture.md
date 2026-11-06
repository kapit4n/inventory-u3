# Architecture

Inventory U3 is one domain, one React application and two deployment shells. The
API owns persistence; the browser and desktop window never access a database.

## Layers

```
Presentation   apps/web, apps/desktop, packages/app, packages/ui
Application    feature queries and use-case calls in packages/app and apps/api
Domain         packages/domain
Infrastructure apps/api persistence, security and HTTP transport
```

Dependencies point inward. `packages/domain` is pure TypeScript and imports no
React, browser API, Tauri, TanStack Query, Zustand, Drizzle or database driver.

## Runtime flow

```
React feature
  -> typed ApiClient (packages/api-client)
  -> Fastify route (apps/api)
  -> domain use case or rule (packages/domain)
  -> repository port
  -> SQLite or PostgreSQL repository
```

The API validates input with Zod, calls the domain, maps failures to one problem
envelope, and returns JSON. The client validates responses where a schema is
supplied.

## Packages

| Package               | Responsibility                                              |
| --------------------- | ----------------------------------------------------------- |
| `packages/domain`     | Entities, invariants, ports and framework-free use cases    |
| `packages/validation` | Zod schemas used at every boundary                          |
| `packages/types`      | Branded identifiers, time and currency primitives           |
| `packages/api-client` | Typed REST transport, error mapping and bearer token header |
| `packages/app`        | Routes, providers, features, shell wiring and i18n          |
| `packages/ui`         | Tokens, layout-safe primitives and shadcn/ui-derived UI     |
| `packages/config`     | Shared ESLint, Vitest, Tailwind and TypeScript config       |
| `packages/tsconfig`   | Base TypeScript configurations                              |
| `packages/api-client` | Client used by web, desktop and tests                       |

## Web and desktop

Both shells call the same `mountApp` entry point. The shell declares only its
runtime target; the shared app owns routes, providers and navigation. Desktop
capabilities are reached through `packages/app/src/platform`, not through Tauri
imports in features.

## Database engines

SQLite is the default development and product engine. PostgreSQL is retained as
a second engine. The two are explicit implementations over the same repository
ports; there is no abstraction layer over them (ADR 0025). Schemas and
migrations live in separate directories:

```
database/schema/           PostgreSQL Drizzle schema
database/schema/sqlite/    SQLite Drizzle schema
database/migrations/       PostgreSQL SQL migrations
database/migrations-sqlite/ SQLite SQL migrations
```

## Authentication

Authentication is opaque bearer sessions. Passwords are hashed with scrypt,
tokens are stored hashed, and the auth plugin resolves a principal before
protected routes run. Permissions are domain values, not strings scattered across
routes. Login attempts are limited in process.

## Errors

Domain failures use a small code set. The API maps them to stable HTTP statuses
and a single envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": {},
    "requestId": "req-..."
  }
}
```

## Internationalization

The UI catalogue is typed and supports English and Spanish. User-facing copy
belongs in `packages/app/src/i18n/locales`; domain data remains literal.

## Guardrails

`pnpm run guard:boundaries` checks dependency direction. Typecheck, lint and tests
run across the workspace with Turbo.
