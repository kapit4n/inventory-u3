# Current Task

> Last updated: 2026-11-17.
>
> **M9 — Quality, Permissions and Operational Hardening is IN_PROGRESS with
> BQ-09-independent work.** M8 is committed as `9099246`, M7 as `e04bafa`, M6 as
> `52e39a3`, M5 as `7441653`, M4 as `8f5f326` and M1–M3 are complete. BR-013,
> BQ-02, BQ-09, BQ-10, BQ-14, BQ-16 and BQ-17 still limit final business semantics.

## Task identity

| Field        | Value                                               |
| ------------ | --------------------------------------------------- |
| Milestone    | M9 — Quality, Permissions and Operational Hardening |
| Task ID      | M9-CI                                               |
| Task         | Add CI and continue independent hardening           |
| Status       | IN_PROGRESS                                         |
| Dependencies | M1 through M8                                       |
| Blocks       | Release readiness                                   |

## Objective

Harden the product for real operational use: expand critical business-flow
coverage, define and implement branch-scoped access, add an audit history,
exercise backup and recovery on both engines, measure report/movement query
performance, add CI and prepare release documentation.

## Scope from the roadmap

- Automated tests across the business flows.
- Business-rule validation.
- Branch-specific access control and user-branch assignment.
- Append-only audit history.
- SQLite and PostgreSQL backup/restore procedures and drills.
- Performance and reliability checks for movement and report queries.
- Security review.
- CI pipeline and release checklist.

## Constraints

- Do not start a feature that belongs to an earlier milestone; M1–M8 are closed.
- Do not invent branch-user rules. BQ-09 asks when branch employees/managers need
  access and what they may see; it is an OPEN QUESTION.
- Do not claim backup/restore, performance or CI acceptance without actually
  executing the check.
- Keep the 25 non-negotiable architectural rules and run
  `pnpm run guard:boundaries`.
- Two engines remain explicit; any new table, index or repository method must be
  implemented in both schema trees and both repository implementations.
- No offline synchronization, GraphQL, Redux, microservices or new database.

## Out of scope

- Changing completed M1–M8 behavior except where an M9 hardening requirement
  explicitly demands it.
- Final WhatsApp fields, order and labels (BR-013).
- Configurable checkpoint/report periods (BQ-02).
- Unit conversion (BQ-10), tax/freight treatment (BQ-14), branch business-day
  boundaries (BQ-16) or no-sales marker (BQ-17) without product decisions.
- Guessing names/codes of the three real branches (BQ-19).
- Inventing supplier details (BQ-21).
- Designing a general audit table before the audit scope is answered (BQ-22).

## Acceptance criteria

- [ ] Critical business rules have automated tests.
- [ ] A branch user can only access assigned branches.
- [ ] Significant corrections are auditable end to end.
- [ ] Backup and restore have been exercised for both engines.
- [ ] Report and movement queries meet an agreed performance target; blocked on BQ-23.
- [ ] CI runs typecheck, lint, tests, build and boundary guard.
- [ ] Release documentation exists and no known critical issue is open.

## Current blocker

BQ-09 blocks meaningful branch-scoped authorization work. BQ-22 blocks a general
audit-log design, BQ-03 blocks production/checkpoint correction approval rules,
and BQ-23 blocks a performance pass/fail claim. Ask for product input before
designing `user_branch_assignments`, a general audit table, new correction-approval
fields, or declaring a performance target met. CI, audit review, backup drills,
baseline measurement and release documentation are independent.

## Verification baseline from M8

- `pnpm run format:check` — PASS.
- `pnpm run typecheck` — PASS, 12/12 tasks.
- `pnpm run lint` — PASS, 12/12 tasks and `BOUNDARY GUARD OK`; one pre-existing
  React Compiler warning for React Hook Form `watch()`.
- `pnpm run guard:boundaries` — PASS.
- `pnpm run test` — PASS, 12/12 tasks; 437 passed and 13 skipped.
- `TEST_DATABASE_URL= pnpm --filter @inventory-u3/api run test:integration` —
  PASS, 16 files, 109 passed and 13 skipped.
- `pnpm run build` — PASS, 5/5 tasks; Vite chunk-size warnings only.
- `pnpm run test:e2e` — PASS, 48 Chromium tests, including two dashboard specs.
- `pnpm exec prettier --check .github/workflows/ci.yml` — PASS.
- Manual CI-style browser run with `CI=true` and a separately started preview
  server — PASS, 48 Chromium tests.
- SQLite backup/restore drill — PASS: 26 tables, `integrity_check` and
  `foreign_key_check` clean, all table counts and backup/restore hashes matched.
- PostgreSQL backup/restore commands are documented, but no PostgreSQL server or
  `pg_dump` exists locally (SI-06), so that drill has not been executed.
- SQLite seeded-data query baseline — PASS as a baseline only: sales-report query
  median 0.0388 ms/p95 0.1152 ms over 13 rows; movement-balance query median
  0.0090 ms/p95 0.0128 ms over 57 movements. No target exists yet (BQ-23).
- PostgreSQL integration cases were skipped because no server is available
  (SI-06), not passed.

## Next action

Verify the new CI workflow on the first push or pull request, then continue M9
hardening that is independent of BQ-09: audit review, backup/restore drills,
performance measurement and release documentation. Ask for BQ-09 input before
branch access work.
