# Inventory U3 — Implementation Progress

> This is the main progress document. Update it at the end of every session.
> Do not mark a task complete unless the repository and its tests prove it.

## Summary

| Field                  | Value                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| Current milestone      | M1 — Business Domain Foundation                                         |
| Current task           | Documentation baseline complete; next task is M1-T1 (branch foundation) |
| Overall project status | Foundation complete; business implementation not started                |
| Completed milestones   | None of M1–M9 (the foundation prerequisite is complete)                 |
| In-progress milestones | M1                                                                      |
| Blocked milestones     | M6 finalization is blocked on BR-013 (WhatsApp reporting format)        |
| Pending milestones     | M2, M3, M4, M5, M6, M7, M8, M9                                          |
| Last verified commit   | `0808074` (2026-11-06) plus uncommitted working-tree changes            |
| Last update date       | 2026-11-09                                                              |
| Next recommended task  | M1-T1 — Branch domain entity, persistence and tests                     |

### Working tree at the time of this update

The documentation baseline changed documentation files only. The working tree
also contains changes made before this documentation task:

- `package.json` — added a `start` script.
- `scripts/start.sh` — new install-and-start helper.

No application behaviour was changed by the documentation baseline itself.

## Verification for this update

| Command                            | Result                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `pnpm run typecheck`               | PASS — 12/12 tasks                                                     |
| `pnpm run lint`                    | PASS — 12/12 tasks, `BOUNDARY GUARD OK`                                |
| `pnpm exec turbo run test --force` | PASS — 12/12 tasks, 127 tests passed                                   |
| `pnpm run test:e2e`                | NOT RUN this session; last recorded result was 18/18 on the foundation |
| `pnpm run format:check`            | PASS — all files use Prettier style                                    |
| Local Markdown link check          | PASS — all local links resolve                                         |
| `pnpm run build`                   | NOT RUN this session; last recorded result was 5/5 on the foundation   |

Test counts by package from the forced run: API 41, desktop 4, database 6,
api-client 15, app 48, domain 13. Total 127. `web`, `config`, `types`, `ui` and
`validation` have no test files and use `--passWithNoTests`/no test task.

PostgreSQL integration tests were not executed because no PostgreSQL server is
available on this machine. This is a known environment limitation, not a pass.

---

## M1 — Business Domain Foundation

**Status: IN_PROGRESS**

### Completed

- [x] Repository architecture, packages, persistence and guardrails inspected.
- [x] Existing implemented domain documented: organization, user, session, role,
      permission, organization settings.
- [x] Actual database tables documented: organizations, users, sessions.
- [x] Confirmed business requirements separated from proposed design.
- [x] Proposed business domain model documented, including branch ownership,
      raw/processed products, measurement and snapshot rules.
- [x] Previous roadmap identified as superseded.
- [x] Documentation/continuity system established.

### In Progress

- [ ] M1-T1: Branch domain entity, repository port and dual-engine schema.
- [ ] M1-T2: Product/category/unit/presentation domain model.
- [ ] M1-T3: Average-weight and raw/processed model.
- [ ] M1-T4: Stock movement and balance concepts.
- [ ] M1-T5: Access model for central operator and future branch users.

### Pending

- [ ] All M1 code, schema, migrations, repository implementations and tests.
- [ ] Update `docs/domain.md` and `docs/architecture.md` with the implemented
      business entities once they exist.
- [ ] Seed the three branches (only after the branch schema exists).

### Validation

- Tests executed: `typecheck`, `lint`, unit/component/API tests (see summary).
- Passed: typecheck 12/12, lint 12/12, tests 127.
- Failed: none.
- Not executed: PostgreSQL integration tests, Playwright E2E, build.
- Business-domain tests: none, because no business domain exists yet.

### Relevant files and modules

- `packages/domain/src/organization/*` — implemented foundation.
- `packages/domain/src/ports/index.ts` — current ports (organization, user, session).
- `database/schema/organization.ts`, `database/schema/sqlite/organization.ts`.
- `database/migrations/*` and `database/migrations-sqlite/*`.
- `apps/api/src/http/routes/*` — only auth, dev-auth, health, organization.
- `packages/app/src/features/inventory/components/inventory-page.tsx` — placeholder.
- `docs/project/BUSINESS_DOMAIN_MODEL.md` — proposed target.

### Important implementation decisions

- Branch is the inventory boundary (TD-001).
- The business domain is designed from confirmed requirements only; no tables
  invented ahead of a milestone.
- The existing organization/user/session foundation is retained.
- The old generic roadmap is superseded (TD-008).

### Known limitations

- No branch, product, stock, purchase, production, sales or closing entity exists.
- The only business-looking UI is a static inventory placeholder.
- The existing roles are foundation roles, not the owner/operator/branch model.
- `data/` is git-ignored; a fresh clone must run migrations and seed.

### Next action

Implement **M1-T1**: add the `Branch` domain entity and organization-owned
persistence on both engines, with repository tests and branch-isolation coverage.
See [CURRENT_TASK.md](./CURRENT_TASK.md).

---

## M2 — Master Data

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Branch management UI/API.
- [ ] Employee master data.
- [ ] Supplier master data.
- [ ] Product categories.
- [ ] Products (raw and processed).
- [ ] Measurement units.
- [ ] Product presentations.
- [ ] Average weight per tray configuration.
- [ ] Selling prices and price history.
- [ ] Raw-to-finished product relationship rules.

### Validation

No implementation and no tests.

### Notes

Depends on M1. See roadmap acceptance criteria.

### Next action

Start after M1 acceptance criteria are verified.

---

## M3 — Supplier Purchases and Receiving

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Purchase and purchase-item model.
- [ ] Branch/supplier assignment.
- [ ] Multi-line purchase entry.
- [ ] Receiving confirmation and stock effect.
- [ ] Purchase-price history.
- [ ] Auditable corrections.
- [ ] UI and tests.

### Validation

No implementation and no tests.

### Notes

Receiving must be idempotent and update stock only once. Correction mechanism is
pending.

### Next action

Start after M1/M2 are verified.

---

## M4 — Branch Inventory

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Movement ledger and balance decision.
- [ ] Raw and finished stock.
- [ ] Adjustments.
- [ ] Damaged/discarded products.
- [ ] Reconciliation.
- [ ] Stock validation and UI.
- [ ] Tests.

### Validation

No implementation and no tests. The `/inventory` route renders a static card.

### Notes

Do not build the stock list before the movement model is decided.

### Next action

Start after M1 and the stock effects of M3.

---

## M5 — Production

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Batch/input/output model.
- [ ] Employee preparer and operator identity.
- [ ] Tray count, average-weight snapshot and estimated weight.
- [ ] Optional raw consumption.
- [ ] Waste/losses.
- [ ] Inventory integration.
- [ ] UI and tests.

### Validation

No implementation and no tests.

### Notes

Raw consumption is optional pending business confirmation.

### Next action

Start after M1, M2 and M4.

---

## M6 — Sales Checkpoints

**Status: NOT_STARTED (finalization blocked on BR-013)**

### Completed

- [ ] Nothing.

### Pending

- [ ] Checkpoint/period model.
- [ ] Aggregate product lines.
- [ ] Processed tray → estimated kg calculation.
- [ ] Raw kg/unit lines.
- [ ] Weight and price snapshots.
- [ ] Waste separation.
- [ ] Correction audit.
- [ ] UI and tests.

### Validation

No implementation and no tests.

### Notes

The exact WhatsApp fields are not confirmed. Build the generic model only after
the product confirms the reported fields, or mark the feature as pending.

### Next action

Confirm BR-013, then start after M1/M2/M4.

---

## M7 — Daily Closing

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Aggregation of purchases, production, sales, waste and stock.
- [ ] Estimated revenue, cost and gross profit.
- [ ] Review/confirm/reopen workflow.
- [ ] Audit history.
- [ ] UI and tests.

### Validation

No implementation and no tests.

### Notes

Cost basis is undecided. Do not hardcode one.

### Next action

Start after M3–M6 and the cost-basis decision.

---

## M8 — Dashboard and Reports

**Status: NOT_STARTED**

### Completed

- [ ] Nothing.

### Pending

- [ ] Consolidated dashboard.
- [ ] Sales/purchases/production/inventory/waste reports.
- [ ] Estimated profit reporting.
- [ ] Daily/weekly/monthly periods.
- [ ] Export.
- [ ] Tests.

### Validation

No implementation and no tests. `/dashboard` is static foundation content.

### Next action

Start only when the source records exist and are confirmed.

---

## M9 — Quality, Permissions and Operational Hardening

**Status: NOT_STARTED**

### Completed

- [x] Foundation quality gates exist: typecheck, lint, boundary guard, unit tests.

### Pending

- [ ] Business-flow test coverage.
- [ ] Branch-specific access control.
- [ ] Audit log.
- [ ] Backup and recovery drills.
- [ ] Performance and reliability.
- [ ] CI pipeline.
- [ ] Release documentation.

### Validation

Foundation gates pass. No backup drill, performance test or CI pipeline exists.

### Next action

Continuous hardening; final milestone before release.
