# Inventory U3 — Implementation Roadmap

> Canonical business roadmap. It supersedes the generic item/stock sequence in
> the old [`docs/roadmap.md`](../roadmap.md), which now points here.
> Last reviewed: 2026-11-09 after M2-T3 (supplier master data, uncommitted).

Status values are used exactly as follows:

| Status       | Meaning                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| NOT_STARTED  | No implementation work has begun.                                        |
| IN_PROGRESS  | Work has begun; acceptance criteria are not all verified.                |
| BLOCKED      | Work cannot proceed without a decision, dependency or external resource. |
| COMPLETED    | Every acceptance criterion has been verified in the repository.          |
| NEEDS_REVIEW | Implemented, but not yet verified or accepted.                           |

## Foundation prerequisite (completed)

The repository already contains the technical foundation from the foundation
extraction phase. It is **not** one of the nine business milestones, but every
milestone depends on it.

- Monorepo, tooling, shared TypeScript/ESLint/Prettier/Vitest configuration.
- Fastify API, configuration validation, problem envelope, structured logging.
- Organization/user/session/role/permission foundation.
- SQLite + PostgreSQL schemas, migrations, seed and repository ports for the
  foundation tables.
- Shared React application, web and desktop shells, UI primitives, i18n.
- Unit, component, API integration and Playwright foundations.
- Boundary guard and quality scripts.

Evidence: source tree, `database/migrations*`, `packages/domain`, `apps/api`,
`packages/app`, `e2e/`, and the verification recorded in
[SESSION_LOG.md](./SESSION_LOG.md).

---

## M1 — Business Domain Foundation

**Status: COMPLETED (M1-T1 to M1-T6).**

### Objective

Turn the generic organization foundation into a branch-aware business domain
foundation without building user-facing inventory features yet.

### Scope

- Define the branch entity and branch ownership for operational data.
- Define products, raw vs processed products, categories and measurement units.
- Define product presentations and average-weight configuration.
- Define stock movement concepts and audit principles.
- Preserve central-operator access and leave room for future branch permissions.
- Establish dual-engine schema, migrations and repository ports for these
  concepts where the milestone requires persistence.

### Dependencies

- Foundation prerequisite (complete).
- Confirmed business requirements BR-001 to BR-026.

### Tasks

| ID    | Task                                                                                     | Status    |
| ----- | ---------------------------------------------------------------------------------------- | --------- |
| M1-T1 | Branch entity, branch ownership fields, repository port and dual-engine schema/migration | COMPLETED |
| M1-T2 | Product, category, measurement unit and presentation domain model                        | COMPLETED |
| M1-T3 | Raw/processed product distinction and average-weight configuration model                 | COMPLETED |
| M1-T4 | Stock movement and balance concepts, including audit-safe correction principles          | COMPLETED |
| M1-T5 | Access model note: central operator now, branch users later                              | COMPLETED |
| M1-T6 | Update technical docs and boundary guard for the new domain                              | COMPLETED |

### Acceptance criteria

- [x] `Branch` exists in the framework-independent domain with organization
      ownership and validation.
- [x] Every future operational entity has a documented branch ownership rule.
- [x] Product/category/unit/presentation concepts exist in the domain without
      React, Drizzle or database imports.
- [x] Raw vs processed products are distinguishable in the model.
- [x] Average weight per tray is configurable on the appropriate presentation
      model; it is not hardcoded.
- [x] Branch foundation table exists in **both** schema trees and both migration
      journals.
- [x] Product foundation tables exist in both trees and both migration journals.
- [x] Branch repository port is implemented for SQLite and PostgreSQL.
- [x] Product repository ports are implemented for SQLite and PostgreSQL.
- [x] Stock movement, reason, source and balance concepts exist in the domain;
      movements are append-only and corrections reference the original.
- [x] Stock remains conceptual: no stock table, port, migration or API exists.
- [x] Initial access is documented: one organization-wide operator, no branch
      login, future branch scope reserved. No branch authorization is implemented.
- [x] `pnpm run guard:boundaries`, `typecheck`, `lint` and `test` pass.
- [x] Documentation reflects the actual implementation, not the proposal.

### Expected database changes

- `branches` (organization-owned).
- `measurement_units`, `product_categories`, `products`,
  `product_presentations` (organization-owned catalog master data).
- `products.kind` and `product_presentations.average_weight_grams` carry the
  M1-T3 measurement configuration.
- Every table added to both `database/schema` trees and both migration journals.
- Seed data may add the three development branches, but only if it stays
  idempotent and clearly development-only.

### Expected UI changes

None required. M1 is a domain/persistence foundation. Do not build inventory
screens in this milestone.

### Tests required

- Domain unit tests for branch ownership, product/measurement and stock
  movement invariants.
- Repository tests for both engines for every implemented port method.
- Branch repository isolation: a branch from another organization cannot be
  read. Cross-branch tests begin with the first branch-owned operational tables
  (M3/M4), because M1 has no such table.
- Migration/seed smoke test on SQLite.
- PostgreSQL tests run when a server is available; otherwise explicitly skipped.

### Notes

The organization/user/session foundation, the branch entity, the catalog
identity, the raw/processed + average-weight configuration, the stock movement
vocabulary and the access-model note are real. Stock persistence, prices and
transactional records do not exist yet; the balance is a type only while BQ-07
and BQ-08 remain open. The access note does not add branch authorization. The
three development branches are intentionally not seeded until their names are
confirmed (BQ-19); that is M2 work, not an M1 gap.

---

## M2 — Master Data

**Status: IN_PROGRESS (M2-T1 branches, M2-T2 employees and M2-T3 suppliers complete).**

### Objective

Let the operator maintain the master data every later workflow depends on.

### Scope

- Branch management (create/edit/list; the three initial branches seeded).
- Employee management (preparer identity, not necessarily a login).
- Supplier management.
- Product categories.
- Product management (raw and processed).
- Measurement units.
- Product presentations.
- Average weight per tray configuration.
- Selling prices per kilogram/unit.
- Raw-to-finished product relationship rules needed by production.

### Dependencies

M1 (domain and persistence foundation).

### Tasks

| ID    | Task                                                            | Status      |
| ----- | --------------------------------------------------------------- | ----------- |
| M2-T1 | Branch list/create/edit, permissions and branch selector        | COMPLETED   |
| M2-T2 | Employee master data and branch assignment                      | COMPLETED   |
| M2-T3 | Supplier master data                                            | COMPLETED   |
| M2-T4 | Category, unit and presentation master data                     | NOT_STARTED |
| M2-T5 | Product create/edit/list for raw and processed products         | NOT_STARTED |
| M2-T6 | Average weight and selling-price configuration with history     | NOT_STARTED |
| M2-T7 | Remaining API routes, validation, problem mapping, UI and tests | NOT_STARTED |

### Acceptance criteria

- [x] Operator can create, list and edit branches.
- [x] Operator can create, list and edit employees and suppliers.
- [ ] Operator can create, list and edit categories, units and products.
- [ ] Every record is organization-scoped; branch-owned records carry a branch.
- [ ] A processed product can have a presentation, average weight per tray and
      selling price per kilogram.
- [ ] A raw product does not require tray configuration.
- [ ] Price changes are effective-dated or otherwise historically preserved.
- [ ] No master-data screen contains business logic beyond form validation.
- [ ] Both engines implement the same repository methods.
- [ ] Unit, integration and browser tests cover the main flows.

### Expected database changes

`branches`, `employees`, `suppliers`, `product_categories`,
`measurement_units`, `products`, `product_presentations`,
`product_price_history`, and any join tables confirmed by the model. All in both
engines.

### Expected UI changes

Master-data screens reachable from Settings or a new Administration area,
including list/search/create/edit forms. Inventory route remains a placeholder
until M4.

### Tests required

Domain validation, repository parity, API route tests, branch isolation, form
component tests, browser tests for create/edit.

### Notes

Do not add purchasing, stock or production records in this milestone.

---

## M3 — Supplier Purchases and Receiving

**Status: NOT_STARTED**

### Objective

Register supplier deliveries per branch and update inventory only on confirmed
receiving.

### Scope

- Register purchases with multiple items.
- Record quantities, units and purchase prices.
- Assign each purchase to a branch and supplier.
- Confirm receiving.
- Update inventory only after confirmation.
- Preserve purchase-price history.
- Support auditable corrections.

### Dependencies

M1 and M2. The stock movement foundation from M1/M4 is consumed here.

### Tasks

- Purchase and purchase-item domain entities and states.
- Receiving use case that creates stock movements exactly once.
- Purchase-price history capture.
- Correction/reversal path with audit fields.
- API routes, validation and problem mapping.
- Purchase and receiving UI.
- Tests across domain, repository, API and browser.

### Acceptance criteria

- [ ] Operator can register a purchase with multiple lines for one branch.
- [ ] A draft purchase does not change stock.
- [ ] Confirming receiving creates stock movements and cannot run twice.
- [ ] Purchase line prices are preserved for history.
- [ ] A received purchase cannot be silently edited or deleted.
- [ ] Correction path records actor, reason and before/after evidence.
- [ ] Both engines pass the same receiving tests.
- [ ] Branch isolation is enforced.

### Expected database changes

`purchases`, `purchase_items`, purchase status, and the stock movement records
created on receiving. Both engines.

### Expected UI changes

Supplier/purchase list, multi-line purchase form, receive confirmation, purchase
detail and correction flow.

### Tests required

State-transition tests, idempotent receiving, receipt → stock movement
integration, price-history immutability, branch isolation, browser test.

### Notes

Whether partial receiving, taxes, freight or payment terms are in scope is
pending. Do not invent them.

---

## M4 — Branch Inventory

**Status: NOT_STARTED**

### Objective

Give every branch an independent, auditable inventory of raw and finished stock.

### Scope

- Independent inventory per branch.
- Raw product inventory.
- Finished product inventory.
- Stock movements.
- Inventory adjustments.
- Damaged and discarded products.
- Inventory reconciliation.
- Appropriate stock validation.

### Dependencies

M1, M2 and the stock effects of M3.

### Tasks

- Stock movement ledger and balance strategy decision.
- Movement reasons and source linking.
- Adjustment and waste flows.
- Reconciliation (count vs expected).
- Stock validation rules.
- Stock list/detail and movement timeline UI.
- Tests across both engines and the browser.

### Acceptance criteria

- [ ] Stock is independent per branch and cannot leak between branches.
- [ ] Every stock change is traceable to a movement, reason and actor.
- [ ] Adjustments and waste are distinct from sales.
- [ ] A reconciliation produces an auditable adjustment.
- [ ] Negative stock is refused unless an explicit, documented override exists.
- [ ] Raw and finished products are handled according to their configured units.
- [ ] Both engines pass the same inventory tests.

### Expected database changes

`stock_movements`, `stock_balances` (or a documented derived strategy),
`inventory_adjustments`, waste records. Both engines.

### Expected UI changes

Branch-aware stock list, product stock detail with movement timeline,
adjustment/waste form, reconciliation screen.

### Tests required

Movement sign/reason rules, non-negative stock, reconciliation math, branch
isolation, full receive → produce → sell → reconcile integration, browser tests.

### Notes

The choice between a derived balance and a maintained cache must be recorded as a
decision before implementation.

---

## M5 — Production

**Status: NOT_STARTED**

### Objective

Record each branch's tray production with the preparer, operator, tray count and
weight snapshots.

### Scope

- Register production batches.
- Assign production to a branch.
- Identify the employee who physically prepared the products.
- Identify the operator who registered the production.
- Register finished product and tray quantity.
- Snapshot average weight per tray.
- Estimate total production weight.
- Register raw material consumption when reliable information is available.
- Support waste and production losses.
- Update raw and finished inventory appropriately.

### Dependencies

M1, M2 and M4.

### Tasks

- Production batch, input and output domain model.
- Snapshot calculation and persistence.
- State transitions (draft → confirmed → corrected).
- Inventory movement integration.
- Production UI with employee picker and estimated weight display.
- Tests and documentation.

### Acceptance criteria

- [ ] A confirmed batch records branch, business date, preparer and registering
      operator.
- [ ] Output records product, presentation and tray count.
- [ ] Average weight per tray is snapshotted and estimated weight is calculated.
- [ ] Changing product configuration later does not alter the batch.
- [ ] Raw consumption is recorded when reported, and explicitly absent otherwise.
- [ ] Waste/losses are recorded separately and affect stock.
- [ ] Confirmed batches are corrected through an audited path.
- [ ] Both engines pass the same production tests.

### Expected database changes

`production_batches`, `production_inputs`, `production_outputs`, status/history
fields. Both engines.

### Expected UI changes

Production entry, batch detail, confirmation and correction screens.

### Tests required

Estimated-weight calculation, snapshot immutability, state transitions, employee
assignment validation, inventory integration, branch isolation, browser test.

### Notes

A recipe/bill of materials is not assumed. Raw inputs may be optional.

---

## M6 — Sales Checkpoints

**Status: NOT_STARTED**

### Objective

Record aggregate sales by branch, business date, checkpoint period and product,
with weight and price snapshots.

### Scope

- Central operator selects branch and business date.
- Support morning and evening checkpoints.
- Register aggregate sales per product.
- Support processed products measured in trays and estimated kilograms.
- Support unprocessed products measured in kilograms or units.
- Preserve historical weight and price snapshots.
- Distinguish sales from damaged or discarded products.
- Support corrections with audit history.

### Dependencies

M1, M2 and M4. Final field design is **BLOCKED on BR-013** (exact WhatsApp
reporting format) before the workflow can be finalized.

### Tasks

- Checkpoint and item domain model.
- Snapshot calculation for processed and raw products.
- Period configuration decision.
- Inventory movement integration.
- Checkpoint entry, review and correction UI.
- Tests and documentation.

### Acceptance criteria

- [ ] Operator can select branch, business date and checkpoint period.
- [ ] At least morning and evening checkpoints are supported.
- [ ] Sales are aggregated by product; no individual sale records exist.
- [ ] Processed lines calculate estimated kg from tray count and snapshot weight.
- [ ] Raw lines use kg or unit without tray conversion.
- [ ] Price and weight snapshots are stored and never recomputed.
- [ ] Waste/damage is excluded from sales.
- [ ] Corrections are audited.
- [ ] Both engines pass the same tests.

### Expected database changes

`sales_checkpoints`, `sales_checkpoint_items`, status/history fields. Both
engines.

### Expected UI changes

Checkpoint entry and review screens with estimated-weight and value display,
waste entry, and correction history.

### Tests required

Calculation and snapshot tests, raw/processed validation, period uniqueness,
state transitions, inventory integration, branch isolation, browser test,
historical immutability regression test.

### Notes

Do not finalize the reporting fields until BR-013 is confirmed. The milestone can
prepare the generic model, but the workflow is blocked from completion.

---

## M7 — Daily Closing

**Status: NOT_STARTED**

### Objective

Produce a reviewed daily summary per branch with estimated revenue, cost and
gross profit, with audited reopening.

### Scope

- Opening inventory.
- Purchases and receiving.
- Production.
- Sales.
- Remaining stock.
- Waste and losses.
- Inventory differences.
- Estimated revenue.
- Estimated costs.
- Estimated gross profit.
- Review and confirmation workflow.
- Auditable reopening and corrections.

### Dependencies

M3, M4, M5 and M6; cost-basis decision.

### Tasks

- Closing aggregation queries and snapshots.
- Cost-basis decision and calculation.
- Status workflow and reopening audit.
- Closing summary UI with drill-down.
- Tests and documentation.

### Acceptance criteria

- [ ] One closing per branch/business date, with audited reopening.
- [ ] All required daily sources are represented or explicitly flagged missing.
- [ ] Revenue uses sales snapshots, not current prices.
- [ ] Cost uses the confirmed cost basis and is labeled estimated.
- [ ] Gross profit is calculated and labeled estimated.
- [ ] Confirmed closing snapshots do not change when master data changes.
- [ ] Inventory differences and waste are visible.
- [ ] Both engines pass the same tests.

### Expected database changes

`daily_closings` and supporting snapshot/history fields. Both engines.

### Expected UI changes

Closing readiness checklist, summary dashboard, drill-down, confirm/reopen
actions with reasons.

### Tests required

Aggregation across mixed days, timezone/day-boundary tests, snapshot
immutability, status transitions, cost calculation, both engines, browser test.

### Notes

The cost basis is **PENDING**. Do not choose one silently.

---

## M8 — Dashboard and Reports

**Status: NOT_STARTED**

### Objective

Give the owner a consolidated view across all three branches and the detail
reports needed to run the business.

### Scope

- Consolidated dashboard for all branches.
- Sales by branch.
- Sales by product.
- Purchases and supplier history.
- Production reports.
- Tray quantities and estimated kilograms.
- Remaining inventory.
- Damaged and discarded products.
- Estimated gross profitability.
- Daily, weekly and monthly reporting.

### Dependencies

M3–M7 with enough confirmed data to report on.

### Tasks

- Report query and API design.
- Consolidated and branch-level filters.
- Dashboard summary cards and charts/tables.
- Period selection (daily/weekly/monthly).
- CSV export via the platform abstraction.
- Tests and documentation.

### Acceptance criteria

- [ ] Owner can view consolidated totals across branches.
- [ ] Owner can filter to one branch.
- [ ] Sales by branch and product match checkpoint data.
- [ ] Purchase/supplier and production reports match source records.
- [ ] Estimated kilograms and revenue are labeled estimated.
- [ ] Waste/damage is distinguishable from sales.
- [ ] Daily/weekly/monthly periods use the organization timezone.
- [ ] Export produces a usable file without giving the UI database access.

### Expected database changes

Likely none beyond indexes or report-support views; any schema change goes to
both engines.

### Expected UI changes

Dashboard and report screens, filters, tables and export actions.

### Tests required

Query-correctness tests with fixture data, period-boundary tests, branch filters,
API tests, browser tests.

### Notes

Do not build reports before the underlying records exist and are confirmed.

---

## M9 — Quality, Permissions and Operational Hardening

**Status: NOT_STARTED**

### Objective

Harden the product for real operational use and prepare a release.

### Scope

- Automated tests across the business flows.
- Business-rule validation.
- Branch-specific access control.
- Audit history.
- Backup and recovery.
- Performance and reliability.
- Future readiness for branch employee access.
- Documentation and release preparation.

### Dependencies

M1–M8.

### Tasks

- Expand coverage for critical business rules.
- Implement branch-scoped authorization and user-branch assignment.
- Add/verify append-only audit history.
- Define SQLite and PostgreSQL backup/restore procedures.
- Load/performance checks for movement and report queries.
- CI pipeline and release checklist.
- Security review.

### Acceptance criteria

- [ ] Critical business rules have automated tests.
- [ ] A branch user can only access assigned branches.
- [ ] Significant corrections are auditable end to end.
- [ ] Backup and restore have been exercised for both engines.
- [ ] Report and movement queries meet an agreed performance target.
- [ ] CI runs typecheck, lint, tests, build and boundary guard.
- [ ] Release documentation exists and no known critical issue is open.

### Expected database changes

`user_branch_assignments`, `audit_log`, supporting indexes. Both engines.

### Expected UI changes

User-branch administration, audit views as needed, release-facing empty/error
states.

### Tests required

Authorization matrix tests, audit tests, backup/restore verification, performance
tests, full regression suite.

### Notes

"Do not mark this milestone complete until the operational checks have actually
been executed." A passing unit suite is not a backup/restore drill.

---

## Status summary

| Milestone               | Status      | Evidence                                                                   |
| ----------------------- | ----------- | -------------------------------------------------------------------------- |
| Foundation prerequisite | COMPLETED   | Foundation code, migrations, tests and recorded verification               |
| M1                      | COMPLETED   | Branch, catalog, measurement, stock and access note; docs and guard closed |
| M2                      | IN_PROGRESS | Branch, employee and supplier master data, API and Settings UI complete    |
| M3                      | NOT_STARTED | No purchase/receiving tables or screens                                    |
| M4                      | NOT_STARTED | No stock tables or screens; inventory route is a placeholder               |
| M5                      | NOT_STARTED | No production tables or screens                                            |
| M6                      | NOT_STARTED | No checkpoint tables or screens; BR-013 pending                            |
| M7                      | NOT_STARTED | No closing tables or screens                                               |
| M8                      | NOT_STARTED | Dashboard is static foundation content; no reports                         |
| M9                      | NOT_STARTED | No CI, branch permissions, audit log or backup drill                       |
