# Current Task

> Last updated: 2026-11-09.
>
> **No feature task is currently in progress.** The documentation baseline was
> completed in the session that produced this file. The next task is M1-T1.

## Task identity

| Field        | Value                                               |
| ------------ | --------------------------------------------------- |
| Milestone    | M1 — Business Domain Foundation                     |
| Task ID      | M1-T1                                               |
| Task         | Branch domain entity, persistence and tests         |
| Status       | NOT_STARTED (ready)                                 |
| Dependencies | Foundation prerequisite (complete); TD-001 accepted |
| Blocks       | M1-T2 onward, M2, M3, M4, M5, M6, M7, M8, M9        |

## Objective

Add the first business entity, **Branch**, to the framework-independent domain and
to both database engines, so every later operational record has a real
branch boundary to reference.

This is deliberately a thin vertical slice: domain rule + ports + dual-engine
persistence + tests. No inventory screens in this task.

## Context

- The business has three independent branches (BR-001).
- Branch is the inventory boundary (TD-001).
- The current domain only has organization, user, session, roles and permissions.
- The current database only has `organizations`, `users` and `sessions`.
- Two engines are non-negotiable: SQLite and PostgreSQL (ADR 0025).
- Branch belongs to an organization; every operational record will reference it.

Read before starting:

1. [BUSINESS_REQUIREMENTS.md](../project/BUSINESS_REQUIREMENTS.md)
2. [BUSINESS_DOMAIN_MODEL.md](../project/BUSINESS_DOMAIN_MODEL.md)
3. [PROJECT_OVERVIEW.md](../project/PROJECT_OVERVIEW.md)
4. The existing domain ports and both schema trees.

## Files and modules involved

- `packages/domain/src/` — new branch entity and port; export it.
- `packages/domain/src/ports/index.ts` — `BranchRepository` and `Repositories`.
- `database/schema/` — PostgreSQL branch table.
- `database/schema/sqlite/` — SQLite branch table.
- `database/migrations/` and `database/migrations-sqlite/` — generated migrations.
- `apps/api/src/infrastructure/persistence/postgres/` — PostgreSQL repository.
- `apps/api/src/infrastructure/persistence/sqlite/` — SQLite repository.
- `apps/api/test/` or package tests — repository and isolation coverage.
- `database/development-data.ts` / `database/seed.ts` — optional three-branch seed.
- Documentation: update `docs/domain.md` and `docs/architecture.md` after the code
  exists.

## Proposed domain shape

Keep it minimal. A branch needs at least:

- id (branded `BranchId` or a documented equivalent)
- organizationId
- name
- code or short label, if needed to distinguish branches
- address/location? **Not required yet** unless a confirmed need appears
- isActive
- createdAt / updatedAt

Do not invent fields that the business has not asked for. A name and an active
flag are enough for the first slice; add a code only if it helps stable references.

## Acceptance criteria

- [ ] Branch entity is pure TypeScript and imports nothing from React, Drizzle,
      PostgreSQL, Tauri or the browser.
- [ ] Branch belongs to exactly one organization and validates non-empty name.
- [ ] `BranchRepository` port exists with the smallest useful methods
      (at least `findById`, `listByOrganization`, `save`/`create`).
- [ ] SQLite and PostgreSQL schemas both define the branch table.
- [ ] Both migration journals receive a migration; SQLite `db:migrate` passes.
- [ ] Both repositories implement the port and are wired through `Repositories`.
- [ ] Organization scoping is explicit in every repository method.
- [ ] A test proves a branch query for one organization cannot return another
      organization's branch.
- [ ] `pnpm run guard:boundaries`, `typecheck`, `lint` and `test` pass.
- [ ] Documentation is updated to show what is now implemented.

## Tests required

- Domain unit test: valid branch and invalid/empty name.
- Repository test: create and read a branch on SQLite.
- Repository test: organization filtering.
- PostgreSQL parity test when `TEST_DATABASE_URL` is available; explicitly skip
  otherwise and record the skip.
- Migration smoke test on a fresh SQLite file.

## Implementation status

- [ ] Domain entity and port
- [ ] PostgreSQL schema and migration
- [ ] SQLite schema and migration
- [ ] PostgreSQL repository
- [ ] SQLite repository
- [ ] Repository wiring
- [ ] Tests
- [ ] Documentation update
- [ ] Verification commands run

## Remaining steps

1. Re-read the current ports, both schema trees and repository implementations.
2. Implement the domain entity and port.
3. Add both schemas and generate both migrations.
4. Implement both repositories and wire them.
5. Add tests, including the cross-organization isolation test.
6. Run `typecheck`, `lint`, `test`, `guard:boundaries` and SQLite migration.
7. Update `IMPLEMENTATION_PROGRESS.md`, this file, `SESSION_LOG.md` and
   `docs/domain.md`.
8. Choose the next task from the roadmap (likely M1-T2).

## Out of scope for this task

- Branch management UI.
- Products, units, categories or presentations.
- Purchase, stock, production, sales or closing records.
- Branch-specific user permissions.
- Any change to existing auth or organization settings behaviour.
