# Inventory U3 — Known Issues

> Last reviewed: 2026-11-09. Separate confirmed defects from suspected issues and
> from intentional scope gaps. Do not close an item by assumption.

## 1. Confirmed bugs

None identified during the current repository inspection.

This is not a claim that the software is bug-free. It means no defect has been
reproduced and confirmed in this review. Add an item here only with evidence
(reproduction, failing test, log or code path).

## 2. Suspected issues needing verification

| ID    | Issue                                                                                                                            | Evidence                                                                                                         | Next step                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| SI-01 | An inactive **organization** is not rejected at login or session resolution; only the user's active flag is checked.             | `packages/domain/src/organization/authenticate.ts`, `auth.ts`; no organization `isActive` check in the auth path | Decide whether organization deactivation must block access; add a test either way.              |
| SI-02 | Session rows are never purged after expiry/revocation. The table grows indefinitely.                                             | No cleanup job or query; `sessions` table only inserts/revokes                                                   | Decide retention policy; add cleanup before production.                                         |
| SI-03 | `docs/progress/REPORT.md` describes only the foundation and may be read as current product status.                               | File content vs business roadmap                                                                                 | Keep as historical report; `PROJECT_OVERVIEW` and progress are canonical.                       |
| SI-04 | There is no CI pipeline, so the green verification results depend on a developer running commands locally.                       | No `.github/` workflow                                                                                           | Add CI in M9 or earlier if desired.                                                             |
| SI-06 | `pnpm run test:integration` fails on this machine because `.env` supplies a `TEST_DATABASE_URL` for an absent PostgreSQL server. | `ECONNREFUSED 127.0.0.1:5433` from the integration global setup; passes with `TEST_DATABASE_URL=`                | Keep the SQLite half runnable with the override; later make the PG probe skip when unreachable. |

## 3. Incomplete features (expected at this stage)

| Area                             | State                                                                    |
| -------------------------------- | ------------------------------------------------------------------------ |
| Branch master data               | Entity and dual-engine persistence implemented. No API route or UI.      |
| Products, categories, units      | Not implemented.                                                         |
| Presentations and average weight | Not implemented; only documented.                                        |
| Suppliers and purchases          | Not implemented.                                                         |
| Stock movements and balances     | Not implemented.                                                         |
| Production batches               | Not implemented.                                                         |
| Sales checkpoints                | Not implemented.                                                         |
| Daily closing                    | Not implemented.                                                         |
| Consolidated reports             | Not implemented. `/dashboard` shows static foundation content.           |
| User administration              | Not implemented, although `users:read`/`users:manage` permissions exist. |
| Branch-specific access           | Not implemented. All current authenticated users can reach all routes.   |
| Audit log                        | Not implemented.                                                         |
| Inventory UI                     | `/inventory` is a placeholder card; it does not list or edit stock.      |

These are roadmap work, not defects. See
[IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md).

## 4. Technical debt

| ID    | Debt                                                                                                                                                          | Impact                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| TD-01 | Unused dependencies in `packages/app`: `@fullcalendar/*`, `luxon`, `date-fns`, `zustand`, `@tanstack/react-table`. Some are planned, none are imported today. | Larger install, misleading stack signals, supply-chain surface.        |
| TD-02 | `docs/architecture.md`, `docs/domain.md` and the new `docs/project/` set overlap. The new documents are canonical summaries; the old ones hold detail.        | Risk of drift if one is updated without the other.                     |
| TD-03 | The existing ADRs are undated.                                                                                                                                | Harder to reconstruct decision chronology; new decisions record dates. |
| TD-04 | The foundation-era roadmap and state files had to be reconciled with the business roadmap.                                                                    | A reader could follow an old link; pointers are now in place.          |
| TD-05 | Password/session security is deliberately simple: bearer token in `localStorage`, in-process rate limiting.                                                   | Acceptable for the foundation, not a production security posture.      |
| TD-06 | PostgreSQL integration tests cannot run on this machine.                                                                                                      | Engine parity is not continuously verified here.                       |
| TD-07 | The desktop shell was not rebuilt in the latest verification session.                                                                                         | Rust/Tauri drift would not be caught by unit tests.                    |
| TD-08 | No database backup/restore procedure exists.                                                                                                                  | Operational risk once real data is entered.                            |

## 5. Missing tests

- Organization-deactivation authorization (see SI-01).
- Session cleanup/retention behaviour (see SI-02).
- PostgreSQL parity on this machine (skipped, not passed).
- Browser E2E for the current working tree (last recorded run is from the
  foundation session).
- Branch API/UI tests, because no route or screen exists yet.
- Product, stock, purchase, production, sales and closing tests, because those
  domains do not exist yet.
- Backup/restore drill.
- Performance/load tests for movement and report queries.

## 6. Unresolved business questions

These are copied from the source of truth in
[open-questions.md](../open-questions.md). Do not resolve them unilaterally.

| ID    | Question                                                                                         | Needed by |
| ----- | ------------------------------------------------------------------------------------------------ | --------- |
| BQ-01 | What exact fields/format do branch employees report through WhatsApp? (BR-013)                   | M6        |
| BQ-02 | Are the 12:00/20:00 checkpoints fixed, configurable or typical?                                  | M6        |
| BQ-03 | Can confirmed checkpoints/production/purchases be corrected, by whom, and with what audit trail? | M3/M5/M6  |
| BQ-04 | What is the estimated cost basis for daily closing?                                              | M7        |
| BQ-05 | Is raw-material consumption always recorded, or only when reliable?                              | M5        |
| BQ-06 | Are product prices and average weights organization-wide or branch-specific?                     | M2        |
| BQ-07 | Are inventory weights derived from a movement ledger or maintained as a balance cache?           | M4        |
| BQ-08 | Are negative stock levels ever allowed?                                                          | M4        |
| BQ-09 | When do branch employees/users need application access, and what may they see?                   | M9        |
| BQ-10 | Are unit conversions between purchase, inventory, production and sales units required?           | M2        |
| BQ-11 | Is there a recipe/bill of materials, or are production inputs free-form per batch?               | M5        |
| BQ-12 | Are transfers between branches in scope?                                                         | Future    |
| BQ-19 | What are the names/codes of the three real branches?                                             | M2        |

## 7. Architecture risks

| Risk | Description                                                                                | Mitigation                                                                     |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| R-01 | Encoding an unconfirmed WhatsApp report format into the schema.                            | Keep BR-013 PENDING; build the generic checkpoint model, not the final fields. |
| R-02 | Two engines drift because every schema change and repository method must be written twice. | Enforce parity in review and tests; ADR 0025.                                  |
| R-03 | Branch isolation regressions once operational tables exist.                                | Add cross-branch/cross-organization tests in every milestone.                  |
| R-04 | Historical snapshots get recomputed by a later "fix".                                      | Explicit immutability tests; snapshot fields in the model.                     |
| R-05 | Cost/profit reporting is treated as exact when it is estimated.                            | Label estimates in UI and reports; confirm cost basis.                         |
| R-06 | Business logic leaks into React components under schedule pressure.                        | Boundary guard; domain-first tasks.                                            |
| R-07 | The static dashboard/inventory placeholders are mistaken for implemented features.         | This documentation and honest status labels.                                   |

## 8. Workarounds

| Situation                            | Workaround                                                             |
| ------------------------------------ | ---------------------------------------------------------------------- |
| No PostgreSQL server on this machine | Use SQLite (default). PostgreSQL tests skip; do not claim they passed. |
| pnpm not on PATH                     | `export PATH="$HOME/.local/bin:$PATH"`                                 |
| Fresh clone has no database          | `pnpm run db:migrate && pnpm run db:seed`, or `./scripts/start.sh`     |
| Need to sign in without a password   | Development login-as routes outside production (ADR 0030)              |
| Playwright browsers missing          | `pnpm --filter @inventory-u3/e2e exec playwright install chromium`     |
| Docker unavailable                   | Default SQLite workflow needs no Docker                                |
