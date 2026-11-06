# CURRENT STATE — Inventory U3

> Last updated: foundation extraction session.
> This file is the resume point. Read `AGENTS.md` first, then this file.

## Current phase

**Phase 1 — Architecture / Foundation.**

The target is a generic inventory foundation: organization, users, sessions,
SQLite/PostgreSQL persistence, a typed API client, a shared React application,
web and desktop shells, and the test/tooling baseline.

Inventory business features are not implemented.

## Done

- [x] Target workspace created from the previous dental foundation
- [x] Dental domain, API, database, app routes and tests removed
- [x] Generic organization/user/session domain and validation
- [x] Minimal PostgreSQL and SQLite schemas: organizations, users, sessions
- [x] Repository ports implemented twice
- [x] Auth, dev-auth and organization settings routes
- [x] Dashboard, inventory placeholder and organization settings pages
- [x] English/Spanish catalogue reduced to current screens
- [x] Branding, storage keys, event names and Tauri identifier updated
- [x] Development seed data and generated migrations
- [x] `pnpm install`, `db:migrate` and `db:seed` succeeded on SQLite
- [x] Unit, component, API integration and Playwright suites rewritten
- [x] Documentation and ADR set reduced to the inventory foundation

## Pending

- [ ] Choose and implement the first inventory business slice (Milestone 2)
- [ ] Decide the physical inventory model in `docs/open-questions.md`
- [ ] Run PostgreSQL integration tests when a server is available
- [ ] Initialize git history if this workspace should be versioned
- [ ] Production deployment, observability and backup work

## Last verification

- `pnpm install --frozen-lockfile` — passed
- `pnpm run format:check` — passed
- `pnpm run typecheck` — 12/12 tasks passed
- `pnpm run lint` — 12/12 tasks passed, including `BOUNDARY GUARD OK`
- `pnpm run test` — 12/12 tasks passed, 127 tests passed
- `pnpm run test:e2e` — 18/18 Playwright tests passed
- `pnpm run build` — 5/5 build tasks passed

## Known limitations

- PostgreSQL integration tests cannot run here because no PostgreSQL server is
  available.
- The desktop shell was not rebuilt in this session; only its Rust package name
  metadata was corrected.
- Git history has not been initialized in the target workspace.
