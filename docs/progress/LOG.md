# Work log

## Foundation extraction — Inventory U3

**Goal:** create a generic inventory foundation from the previous dental
codebase without changing the source project.

**Work:**

- Copied the workspace to `/home/luis/proj/inventory-u3`.
- Removed dental domain, database, API, app, i18n and E2E material.
- Replaced identifiers, package scope, branding and product copy.
- Reduced domain and validation to organization, user, session and shared
  primitives.
- Added minimal PostgreSQL and SQLite schemas plus generated migrations.
- Rewrote persistence, auth plugin, routes, seed data and integration tests.
- Replaced dashboard, inventory and settings screens with foundation pages.
- Reduced the translation catalogue to the current screens.
- Updated storage keys, unauthorized event name and Tauri identifier.
- Rewrote the browser suite around shell, auth, settings and language behavior.
- Reduced documentation and ADRs to the inventory foundation.

**Verification:**

- `pnpm install` — passed and refreshed the lockfile checksum
- `pnpm install --frozen-lockfile` — passed
- `pnpm run db:migrate` — passed on SQLite
- `pnpm run db:seed` — passed on SQLite
- `pnpm run format:check` — passed
- `pnpm run typecheck` — 12/12 tasks passed
- `pnpm run lint` — 12/12 tasks passed, including boundary guard
- `pnpm run test` — 12/12 tasks passed, 127 tests passed
- `pnpm run test:e2e` — 18/18 tests passed
- `pnpm run build` — 5/5 build tasks passed

**Open:**

- PostgreSQL integration tests skipped: no server available.
- Inventory product model still needs product decisions.
