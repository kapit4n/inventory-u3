# Inventory U3 — Known Issues

> Last reviewed: 2026-11-17. Separate confirmed defects from suspected issues and
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
| SI-04 | A CI workflow now exists, but its first GitHub Actions run has not been verified.                                                | `.github/workflows/ci.yml` is formatted and the CI-style browser path passed locally with `CI=true`              | Verify on the first push or pull request before closing this item.                              |
| SI-06 | `pnpm run test:integration` fails on this machine because `.env` supplies a `TEST_DATABASE_URL` for an absent PostgreSQL server. | `ECONNREFUSED 127.0.0.1:5433` from the integration global setup; passes with `TEST_DATABASE_URL=`                | Keep the SQLite half runnable with the override; later make the PG probe skip when unreachable. |

## 3. Incomplete features (expected at this stage)

| Area                         | State                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch master data           | Entity, dual-engine persistence, list/create/edit API, Settings UI and active-branch selector implemented. The seed now carries three illustrative development branches; the real branch names remain open (BQ-19).                                                                                                                                   |
| Catalog identity             | Units, categories, products and presentations have domain, dual-engine persistence, API, typed client, UI and tests. Category and unit management is in Settings; products use `/products` and expose the presentation editor for processed products (TD-015). The development seed carries an illustrative fruit-and-vegetable catalogue.            |
| Raw/processed products       | Product kind implemented; production/sales workflows that use it are not.                                                                                                                                                                                                                                                                             |
| Average weight per tray      | Configured weight is implemented on presentations; production outputs snapshot the average weight, estimate and optional measured weight with a weight basis (ADR 0042, TD-019).                                                                                                                                                                      |
| Product prices and history   | Effective-dated, append-only selling prices are implemented in the domain, both engines, API, typed client, `/products` UI and tests.                                                                                                                                                                                                                 |
| Suppliers and purchases      | Supplier master data and M3 purchase registration, receiving, cancellation, audited full reversal and `/purchases` UI are implemented and tested. Partial receiving, taxes, freight, shared deliveries and supplier payment details remain open (BQ-10, BQ-13, BQ-14, BQ-15, BQ-21).                                                                  |
| Stock movements and balances | Append-only exact-thousandth movements drive derived branch balances. Receiving, corrections, manual adjustments, waste and reconciliation are implemented with authenticated routes, typed client, `/inventory` UI and tests on both engines (ADR 0041, TD-018). PostgreSQL integration cases still skip without a server (SI-06).                   |
| Production batches           | Draft, confirmed and corrected branch batches are implemented with preparer/operator identity, tray counts, weight snapshots, optional raw inputs, waste, ledger integration, API/client/UI and tests on both engines. PostgreSQL integration cases still skip without a server (SI-06).                                                              |
| Sales checkpoints            | Aggregate checkpoints, weight/price snapshots, ledger integration, API/client/UI and tests are implemented on both engines (ADR 0043, TD-020). BR-013/BQ-02/BQ-17 still block final WhatsApp fields, configurable periods and no-sales. PostgreSQL integration cases still skip without a server (SI-06).                                             |
| Daily closing                | Versioned daily closings, latest-purchase costing, warnings, API/client/UI and tests are implemented on both engines (ADR 0044, TD-021). Day bounds use the organization timezone until BQ-16; unit mismatches report `UNAVAILABLE` cost until BQ-10; seeded data has no purchases. PostgreSQL integration cases still skip without a server (SI-06). |
| Consolidated reports         | `/dashboard` now shows on-demand source reports with branch/date/granularity filters, estimated profit and CSV export (ADR 0045, TD-022). BR-013/BQ-02/BQ-10/BQ-14/BQ-16/BQ-17 remain open; a small seeded-data SQLite baseline exists, but no performance target or production-size drill is agreed (BQ-23).                                         |
| User administration          | Not implemented, although `users:read`/`users:manage` permissions exist.                                                                                                                                                                                                                                                                              |
| Branch-specific access       | Documented in `docs/project/ACCESS_MODEL.md`; no assignment, authorization or UI gate is implemented.                                                                                                                                                                                                                                                 |
| Audit log                    | No general `audit_log`. M3-M7 use per-entity ledgers, snapshots and inline actor/reason fields; purchase cancellation has no actor/reason, price history has no actor, draft discard is a hard delete, and master-data/settings edits are unlogged. Scope is BQ-22; production/checkpoint correction approval scope is BQ-03.                         |
| Inventory UI                 | `/inventory` is implemented with branch selection, stock balances, movement history and adjustment, waste and reconciliation dialogs.                                                                                                                                                                                                                 |

These are roadmap work, not defects. See
[IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md).

## 4. Technical debt

| ID    | Debt                                                                                                                                                                                                                       | Impact                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| TD-01 | Unused dependencies in `packages/app`: `@fullcalendar/*`, `luxon`, `date-fns`, `zustand`, `@tanstack/react-table`. Some are planned, none are imported today.                                                              | Larger install, misleading stack signals, supply-chain surface.                        |
| TD-02 | `docs/architecture.md`, `docs/domain.md` and the new `docs/project/` set overlap. The new documents are canonical summaries; the old ones hold detail.                                                                     | Risk of drift if one is updated without the other.                                     |
| TD-03 | The existing ADRs are undated.                                                                                                                                                                                             | Harder to reconstruct decision chronology; new decisions record dates.                 |
| TD-04 | The foundation-era roadmap and state files had to be reconciled with the business roadmap.                                                                                                                                 | A reader could follow an old link; pointers are now in place.                          |
| TD-05 | Password/session security is deliberately simple: bearer token in `localStorage`, in-process rate limiting.                                                                                                                | Acceptable for the foundation, not a production security posture.                      |
| TD-06 | PostgreSQL integration tests cannot run on this machine.                                                                                                                                                                   | Engine parity is not continuously verified here.                                       |
| TD-07 | The desktop shell was not rebuilt in the latest verification session.                                                                                                                                                      | Rust/Tauri drift would not be caught by unit tests.                                    |
| TD-08 | SQLite backup/restore procedure is defined and a restore drill passed locally; PostgreSQL commands are defined but not executed here.                                                                                      | PostgreSQL restore and a production restore rehearsal remain unverified.               |
| TD-09 | The boundary guard compares schema table names and journal entry counts, not columns, indexes, foreign keys or migration contents. The guard script has no permanent spec.                                                 | Integration tests remain the authority for engine parity; guard drift is possible.     |
| TD-10 | Duplicate-key handling for branches, categories, unit codes and per-product presentation names checks with a lookup before insert/update. A concurrent write can still hit the database unique constraint after the check. | Concurrent writes could surface as an unmapped 500 instead of the normal 409 conflict. |
| TD-11 | Resolved in M4: stock movements use exact integer thousandths (`quantity_delta_milli`) and existing rows are converted in migration `0009` (TD-018).                                                                       | Closed.                                                                                |

## 5. Missing tests

- Organization-deactivation authorization (see SI-01).
- Session cleanup/retention behaviour (see SI-02).
- PostgreSQL parity on this machine (skipped, not passed).
- Browser E2E for master-data, product, presentation, price, purchase,
  production, sales-checkpoint and daily-closing flows exists. The reusable
  branch selector still has no dedicated component test.
- User-to-branch assignment and branch-scoped authorization tests (M9).
- Estimated/measured weight, snapshot, price-history and consolidated report
  tests exist for production, sales, closing and dashboard reporting.
- Stock movement, balance, adjustment, waste, reconciliation, purchase,
  production, sales-checkpoint and daily-closing domain, repository, route,
  client, component and browser tests exist. PostgreSQL cases still skip locally.
- Boundary-guard regression tests; the current checks are exercised manually and by running the guard.
- Backup/restore drill.
- Performance/load tests for movement and report queries.

## 6. Unresolved business questions

These are copied from the source of truth in
[open-questions.md](../open-questions.md). Do not resolve them unilaterally.

| ID    | Question                                                                               | Needed by                                    |
| ----- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| BQ-01 | What exact fields/format do branch employees report through WhatsApp? (BR-013)         | M6                                           |
| BQ-02 | Are the 12:00/20:00 checkpoints fixed, configurable or typical?                        | M6                                           |
| BQ-05 | Is raw-material consumption always recorded, or only when reliable?                    | M5                                           |
| BQ-06 | Are product prices and average weights organization-wide or branch-specific?           | M2                                           |
| BQ-07 | Are inventory weights derived from a movement ledger or maintained as a balance cache? | Resolved: derived ledger (ADR 0041, TD-018). |
| BQ-08 | Are negative stock levels ever allowed?                                                | Resolved: refused (ADR 0041, TD-018).        |
| BQ-09 | When do branch employees/users need application access, and what may they see?         | M9                                           |
| BQ-10 | Are unit conversions between purchase, inventory, production and sales units required? | M2                                           |
| BQ-11 | Is there a recipe/bill of materials, or are production inputs free-form per batch?     | M5                                           |
| BQ-12 | Are transfers between branches in scope?                                               | Future                                       |
| BQ-19 | What are the names/codes of the three real branches?                                   | M2                                           |
| BQ-20 | Are employees shared across branches, or does each employee belong to one branch?      | M2/M5                                        |
| BQ-13 | Is one supplier delivery shared across branches, or a separate purchase per branch?    | M3                                           |
| BQ-14 | Are purchase prices tax-inclusive, and are taxes/freight part of cost?                 | M3/M7                                        |
| BQ-15 | Is partial receiving allowed?                                                          | M3                                           |
| BQ-16 | Does every branch day start/end at local midnight?                                     | M7/M8                                        |
| BQ-17 | Is an explicit "no sales" checkpoint required?                                         | M6/M8                                        |
| BQ-21 | Which supplier contact, tax and payment details are required beyond the name?          | M3                                           |

## 7. Architecture risks

| Risk | Description                                                                                | Mitigation                                                                               |
| ---- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| R-01 | Encoding an unconfirmed WhatsApp report format into the schema.                            | Keep BR-013 PENDING; build the generic checkpoint model, not the final fields.           |
| R-02 | Two engines drift because every schema change and repository method must be written twice. | Enforce parity in review and tests; ADR 0025.                                            |
| R-03 | Branch isolation regressions once operational tables exist.                                | Add cross-branch/cross-organization tests in every milestone.                            |
| R-04 | Historical snapshots get recomputed by a later "fix".                                      | Explicit immutability tests; snapshot fields in the model.                               |
| R-05 | Cost/profit reporting is treated as exact when it is estimated.                            | Label estimates in UI and reports; latest-purchase cost is confirmed (ADR 0044, TD-021). |
| R-06 | Business logic leaks into React components under schedule pressure.                        | Boundary guard; domain-first tasks.                                                      |
| R-07 | On-demand reports are mistaken for immutable period snapshots.                             | Label estimates, keep ADR 0045/TD-022 and clarify that closings remain daily snapshots.  |

## 8. Workarounds

| Situation                            | Workaround                                                             |
| ------------------------------------ | ---------------------------------------------------------------------- |
| No PostgreSQL server on this machine | Use SQLite (default). PostgreSQL tests skip; do not claim they passed. |
| pnpm not on PATH                     | `export PATH="$HOME/.local/bin:$PATH"`                                 |
| Fresh clone has no database          | `pnpm run db:migrate && pnpm run db:seed`, or `./scripts/start.sh`     |
| Need to sign in without a password   | Development login-as routes outside production (ADR 0030)              |
| Playwright browsers missing          | `pnpm --filter @inventory-u3/e2e exec playwright install chromium`     |
| Docker unavailable                   | Default SQLite workflow needs no Docker                                |
