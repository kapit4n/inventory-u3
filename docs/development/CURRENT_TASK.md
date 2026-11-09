# Current Task

> Last updated: 2026-11-09.
>
> **M2-T1 is COMPLETED.** M1 is complete. The first M2 slice implements branch
> list/create/edit and the reusable branch-selector foundation. Branch seeding
> remains blocked on BQ-19.

## Task identity

| Field        | Value                                               |
| ------------ | --------------------------------------------------- |
| Milestone    | M2 — Master Data                                    |
| Task ID      | M2-T1                                               |
| Task         | Branch management and branch-selector foundation    |
| Status       | COMPLETED                                           |
| Dependencies | M1 complete; access model documented                |
| Blocks       | M2 employee master data and branch-owned M3 records |

## Objective

Let an authenticated administrator list, create and edit branches through the API
and the shared React application, and provide a reusable branch selector for the
branch-owned forms that arrive in later milestones.

## Scope

- Add domain update behavior for a branch name and active state.
- Add `findByName` and `update` to the branch repository port and implement both
  for SQLite and PostgreSQL.
- Add HTTP validation schemas and typed REST-client functions.
- Add `GET`, `POST` and `PUT /api/v1/branches` routes.
- Use `organization:read` for listing and `organization:manage` for writes. A
  branch is deactivated, never hard-deleted, so future operational history keeps
  its reference.
- Add branch management to the Settings screen, visible read-only to every
  authenticated role and editable by administrators.
- Add a reusable branch selector that lists active branches by default.
- Add domain, repository, route, validation and REST-client tests.
- Update backend, domain, access, progress, roadmap, state, known-issues and
  session documentation.

## Out of scope

- Seeding the three real branches (BQ-19 is unanswered).
- Deleting branches or cascading operational data.
- Branch-specific authorization, user-branch assignment or a branch switcher in
  the application shell.
- Employee, supplier, category, unit, product or price master data.
- Inventory screens or stock records.

## Acceptance criteria

- [x] A branch name is trimmed and validated by the domain on create and update.
- [x] Branches are unique by name within an organization, with a clear conflict
      response rather than a database error.
- [x] Both engines implement `findByName` and `update`, and reads stay
      organization-scoped.
- [x] Branch routes require authentication and the documented permissions.
- [x] The Settings screen lists branches and lets an administrator create and
      edit them, including deactivation.
- [x] The reusable selector exposes active branches and is ready for M3/M4 forms.
- [x] Tests cover the domain rule, both repository methods, route permissions and
      validation, and the REST-client contract.
- [x] Typecheck, lint, unit/integration tests, guard, build and formatting pass.

## Completion record

- Domain, dual-engine repositories, HTTP routes, REST client and Settings UI are
  implemented and tested.
- Branch writes are administrator-only through `organization:manage`; branch
  reads use `organization:read`.
- Branches are deactivated, never hard-deleted. The selector lists active branches
  by default.
- Verified on 2026-11-09: full typecheck, lint, boundary guard, unit/component
  tests, integration tests, build and formatting pass. PostgreSQL integration
  cases skip because no server is available.
- M2-T1 is uncommitted in the working tree pending explicit commit authorization.

## Next task

After M2-T1, continue M2 with the next confirmed master-data slice. Do not seed
branches until BQ-19 is answered.
