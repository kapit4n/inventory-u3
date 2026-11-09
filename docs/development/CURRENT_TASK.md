# Current Task

> Last updated: 2026-11-09.
>
> **M2-T2 is COMPLETE.** M2-T1 branch management is also complete. This slice adds
> employee master data with a single branch assignment, so later production can
> record who prepared a product. Employees do not log in. The work is committed as
> `6b50606`.

## Task identity

| Field        | Value                                                       |
| ------------ | ----------------------------------------------------------- |
| Milestone    | M2 — Master Data                                            |
| Task ID      | M2-T2                                                       |
| Task         | Employee master data and branch assignment                  |
| Status       | COMPLETED                                                   |
| Dependencies | M2-T1 complete; branch repository and Settings UI available |
| Blocks       | M5 production preparer identity and employee picker         |

## Objective

Let an authenticated administrator list, create and edit employees, assigning
each employee to a branch of the same organization. Provide read-only employee
visibility to the other authenticated roles and a typed API the later production
workflow can consume.

## Scope

- Add an `Employee` entity with a full name, organization, branch and active flag.
- Add an `EmployeeId` branded identifier and repository port.
- Enforce organization-scoped reads and writes; validate that the assigned branch
  exists in the caller's organization.
- Deactivate rather than delete employees so future production records keep their
  preparer reference.
- Add `GET`, `POST` and `PUT /api/v1/employees` routes.
- Use `organization:read` for listing and `organization:manage` for writes, the
  same administration boundary as branches (TD-011).
- Add typed REST-client functions, branch assignment validation and response
  validation.
- Add employee management to Settings, read-only for non-administrators.
- Add domain, dual-engine repository, route, REST-client and component tests.
- Update the domain, backend, access, progress, roadmap, state, known-issues and
  session documentation.

## Out of scope

- Employee login accounts, user-to-branch assignment or branch-scoped access (M9).
- Payroll, attendance, schedules, wages, contact details or identity documents.
- Production batches, employee pickers in operational forms or stock effects.
- Seeding real employees; their names are not confirmed.
- Hard deletion or branch-transfer history.

## Assumptions and open questions

- **Assumption:** an employee belongs to exactly one branch, following the
  proposed domain model and `Employee belongs to Branch`.
- **OPEN QUESTION (BQ-20):** whether employees are shared across branches or
  branch-local is not confirmed. The chosen model can later gain a join table
  without changing the employee identity.
- The branch must belong to the same organization. The selector shows active
  branches for new employees and existing branches when editing an employee on a
  deactivated branch.
- Employees have no unique-name rule; duplicate real names are possible.
- `Employee` contains no application-user link and no contact information.

## Acceptance criteria

- [x] An employee full name is trimmed and validated by the domain on create and
      update.
- [x] Every employee read and write is scoped to the caller's organization.
- [x] Create and update reject a branch that does not belong to the organization.
- [x] Both engines implement `findById`, `listByOrganization`, `create` and
      `update`, with migrations and parity.
- [x] Employee routes require authentication and the documented permissions.
- [x] Settings lists employees with their branch and lets an administrator create,
      edit and deactivate them.
- [x] Non-administrators see employees read-only and cannot call write routes.
- [x] Tests cover domain rules, both repository methods, routes, REST client and
      the Settings component.
- [x] Typecheck, lint, unit/integration tests, guard, build and formatting pass.

## Completion record

- Implementation and documentation are committed as `6b50606` after explicit
  authorization.
- Verified: typecheck 12/12, lint 12/12 with `BOUNDARY GUARD OK`, unit/component
  209 passed + 6 skipped, SQLite integration 42 passed + 6 skipped, build 5/5,
  SQLite migrations through `0004`, seed, and formatting.
- PostgreSQL repository cases were skipped because no server is available.
- No employee seed was added because real names are unavailable.
- Branch-local employee ownership is an assumption pending BQ-20 (TD-012).

## Next task

M2-T3 supplier master data. Do not seed employees until real names are available.
