# Inventory U3 — Technical Decisions

This is the decision log for **product and technical decisions** that are not
already captured as a foundation ADR. The ADR files in
[`docs/decisions/`](../decisions/README.md) remain the detailed record for
foundation architecture; they are indexed in section 1.

Status values: `PROPOSED`, `ACCEPTED`, `SUPERSEDED`.

Rules:

- Preserve superseded decisions; do not delete history.
- A decision that changes the architecture should also get an ADR.
- Record the date the decision entered the project, not a guessed earlier date.
- If a decision depends on unconfirmed business input, mark it **PENDING**, not
  accepted.

## 1. Foundation ADR index

The ADR files are mostly undated; the project was committed on 2026-11-06
(commit `0808074`). Treat their date as "foundation phase (date not recorded in
the ADR)" rather than inventing one.

| ID   | Decision                                                           | Status   |
| ---- | ------------------------------------------------------------------ | -------- |
| 0001 | pnpm + Turborepo monorepo                                          | ACCEPTED |
| 0002 | Tauri 2 for desktop                                                | ACCEPTED |
| 0004 | Framework-independent domain                                       | ACCEPTED |
| 0005 | REST over HTTP with Fastify                                        | ACCEPTED |
| 0006 | Feature-oriented frontend, one component library                   | ACCEPTED |
| 0007 | TanStack Query for server state, Zustand for local state           | ACCEPTED |
| 0008 | One React app package with thin shells                             | ACCEPTED |
| 0009 | Platform abstraction                                               | ACCEPTED |
| 0010 | Tailwind v4 + shadcn/ui + token layer                              | ACCEPTED |
| 0013 | Shells declare a target; the app owns the rest                     | ACCEPTED |
| 0019 | Keep the last desktop build that worked                            | ACCEPTED |
| 0025 | Two engines: SQLite runs the product, PostgreSQL is kept           | ACCEPTED |
| 0028 | Authentication is opaque bearer sessions, hashed at rest           | ACCEPTED |
| 0029 | Login attempts are limited in process                              | ACCEPTED |
| 0030 | Development login-as is gated by route existence                   | ACCEPTED |
| 0032 | UI language is a typed catalogue, Spanish by default               | ACCEPTED |
| 0038 | Inventory U3 starts from a generic organization/session foundation | ACCEPTED |
| 0039 | Branch-scoped persistence                                          | ACCEPTED |

## 2. Product and technical decisions

### TD-001 — The branch is the inventory boundary

- **Date:** 2026-11-09
- **Status:** ACCEPTED
- **Context:** The business has three independent branches, each receiving its
  own deliveries and preparing its own trays. The owner needs consolidation.
- **Decision:** Model `Branch` as a first-class entity under `Organization`.
  Every operational record (purchase, stock movement, adjustment, production,
  sales checkpoint, daily closing) belongs to exactly one branch. Inventory is
  never shared between branches. Reports may aggregate across branches.
- **Alternatives considered:**
  - Organization-wide inventory with a free-text location: rejected because it
    cannot enforce independence or future branch permissions.
  - Separate organizations per branch: rejected because the owner needs one
    consolidated tenant and shared master data may be desirable.
- **Consequences:** Every future operational table needs `branchId`; repository
  methods and API routes must accept and validate a branch. A user-branch
  permission model can be added later without changing the data boundary.
- **Implementation:** M1-T1 added the entity, both schemas, both migrations and
  both repository implementations. Branch code, address and settings are
  deferred until required. Branch names are unique per organization.
- **ADR:** [0039 — Branch-scoped persistence](../decisions/0039-branch-scoped-persistence.md).

### TD-002 — Sales are aggregate checkpoints, not itemized transactions

- **Date:** 2026-11-09
- **Status:** ACCEPTED
- **Context:** Branch employees report through WhatsApp; the initial version does
  not register individual sales, and the owner needs per-branch/product totals.
- **Decision:** Record sales as `SalesCheckpoint` headers (branch, business date,
  checkpoint period) with `SalesCheckpointItem` aggregate lines per product.
  Do not build a customer, sale-line or payment model in the initial version.
- **Alternatives considered:**
  - Individual sale records: rejected for the initial version; no data source or
    confirmed requirement.
  - Free-form daily totals without product detail: rejected because sales by
    product are required.
- **Consequences:** There is no customer-level or transaction-level audit. The
  model supports morning/evening checkpoints and per-product aggregates. Exact
  WhatsApp fields remain pending.
- **ADR:** None yet; the reporting format is still PENDING (BR-013).

### TD-003 — Estimated weight is derived and snapshotted

- **Date:** 2026-11-09
- **Status:** ACCEPTED
- **Context:** Processed products are sold in trays, but revenue is based on
  kilograms. The business supplies an average weight per tray.
- **Decision:** For processed products compute `estimatedKg = trayCount ×
averageWeightPerTray` and `estimatedValue = estimatedKg × sellingPricePerKg`.
  Store the average weight, price, estimated weight and a discriminator for
  estimated vs measured weight on the historical record. Never recompute a
  historical record from current master data.
- **Alternatives considered:**
  - Weigh every tray: not required by the business and slower to record.
  - Store only tray count and compute on read: rejected because price and weight
    changes would rewrite history.
- **Consequences:** Production and sales snapshots must be written in the same
  transaction as the record they describe. Weight precision and rounding rules
  remain open.
- **ADR:** None yet; implementation detail belongs to M5/M6.

### TD-004 — Central operator only in the initial version

- **Date:** 2026-11-09
- **Status:** ACCEPTED
- **Context:** Branch employees do not access the application initially; one
  operator enters all three branches' information.
- **Decision:** Build initially for one authenticated operator role with access to
  all branches. Keep branch and organization scope in the data model so
  branch-specific users can be added later without a migration rewrite.
- **Alternatives considered:**
  - Build branch roles now: rejected as premature; no confirmed access rules.
  - One user per branch now: rejected because the operator enters all branches.
- **Consequences:** The existing `MANAGER`/`STAFF` roles are not yet a business
  permission model. `UserBranchAssignment` is deferred to M9.

### TD-005 — No WhatsApp API integration

- **Date:** 2026-11-09
- **Status:** ACCEPTED
- **Context:** WhatsApp is the current external communication channel; no
  integration is required for the first version.
- **Decision:** Do not add a WhatsApp API client, webhook, bot or external
  messaging dependency. Model the information the operator manually enters.
- **Alternatives considered:** Direct WhatsApp Business API integration;
  rejected as out of scope until a confirmed requirement exists.
- **Consequences:** Data entry is manual. The application must make aggregate
  entry fast and reviewable rather than trying to automate message ingestion.

### TD-006 — Money is integer minor units

- **Date:** foundation phase (implemented in `packages/types`, commit 2026-11-06)
- **Status:** ACCEPTED
- **Context:** Floating-point money produces rounding defects.
- **Decision:** Represent money as an integer amount in the currency's minor unit
  with a currency code (`MoneyAmount`). Never use floats for stored money.
- **Alternatives considered:** Decimal strings; not needed for the current
  foundation. Revisit if tax or multi-currency accounting is added.
- **Consequences:** Future purchase prices, sales values, costs and profit
  calculations must use minor units and define rounding rules for derived
  amounts.

### TD-007 — Documentation is the persistent source of truth

- **Date:** 2026-11-09
- **Status:** ACCEPTED
- **Context:** Development sessions must be resumable without the previous
  conversation's context.
- **Decision:** The project state is recorded in
  [`docs/development/`](../development/IMPLEMENTATION_PROGRESS.md), with the
  business requirements and model in [`docs/project/`](./PROJECT_OVERVIEW.md) and
  workflows in [`docs/workflows/`](../workflows/INVENTORY_WORKFLOW.md). Every
  session updates progress, current task and the session log.
- **Alternatives considered:** Rely on chat history or commit messages alone;
  rejected because neither captures intent, open questions or next steps
  reliably.
- **Consequences:** Documentation updates are part of the definition of done.
  Do not mark work complete because it was discussed; verify it in the repository.

### TD-008 — The previous foundation-era roadmap is superseded

- **Date:** 2026-11-09
- **Status:** ACCEPTED (supersedes the roadmap content, not an ADR)
- **Context:** The earlier `docs/roadmap.md` described a generic item-catalog,
  stock-movement and reporting sequence that predates the confirmed branch,
  production and sales-checkpoint requirements.
- **Decision:** The canonical sequence is
  [`IMPLEMENTATION_ROADMAP.md`](../development/IMPLEMENTATION_ROADMAP.md)
  (M1–M9). `docs/roadmap.md` remains as a pointer for anyone following an old
  link. The old sequence is preserved in Git history.
- **Alternatives considered:** Keep both roadmaps; rejected because contradictory
  plans are worse than a single superseded pointer.
- **Consequences:** New work must be scheduled against M1–M9. Adding a milestone
  requires updating the roadmap and progress file together.

### TD-009 — Catalog master data is organization-wide and units are explicit

- **Date:** 2026-11-09
- **Status:** ACCEPTED for M1-T2; scope may be revised if BQ-06 is answered
  differently.
- **Context:** The business has independent branches but one central operator.
  BQ-06 asks whether prices and average weights are organization-wide or
  branch-specific; the confirmed requirements do not answer it. BQ-10 leaves
  unit conversion open.
- **Decision:** Measurement units, categories, products and presentations are
  organization-owned master data. A product references explicit inventory,
  sales and optional purchase/production units. No conversion factor is stored
  or applied. Branch ownership starts with stock and operational records, not
  with the catalog row.
- **Alternatives considered:** Duplicate the catalog per branch; rejected because
  it would fragment master data before a confirmed requirement. Store a
  conversion factor per product; rejected because BQ-10 is unresolved and a
  guessed factor would silently corrupt quantities.
- **Consequences:** Catalog reads are scoped by organization, not branch. If
  BQ-06 is later answered as branch-specific, prices and configuration need a
  deliberate extension rather than a reinterpretation of these rows. Every
  quantity must say which unit it uses until conversion is confirmed.

### TD-010 — Product kind is required and average weight is exact integer grams

- **Date:** 2026-11-09
- **Status:** ACCEPTED for M1-T3.
- **Context:** BR-015 requires a configurable average weight per tray for
  processed products, and BR-021 says raw products use their configured unit
  without tray conversion. The measurement rules proposed 0.001 kg precision.
- **Decision:** Every product carries a required `RAW` or `PROCESSED` kind.
  Every presentation carries a required positive `averageWeightGrams`. Integer
  grams represent the proposed 0.001 kg precision exactly without floating-point
  drift. The raw/processed kind is not duplicated on the presentation.
- **Alternatives considered:** Store kilograms as a floating-point number;
  rejected because it invites rounding drift. Store a decimal/string; rejected
  because grams are sufficient at the documented precision and simpler to
  validate. Make weight optional; rejected because a presentation is the
  packaging of a processed product, and an unweighed presentation would leave
  the confirmed requirement unenforced.
- **Consequences:** Migrations add a non-null `products.kind` and
  `product_presentations.average_weight_grams` with no hidden default. The
  catalog tables were empty when the migration was written; a database with
  existing rows must be backfilled explicitly. Display converts grams to
  kilograms at the UI boundary. Estimated/measured weights and historical
  snapshots still need later additions.

### TD-011 — Branches are administered through organization permissions and deactivated, not deleted

- **Date:** 2026-11-09
- **Status:** ACCEPTED for M2-T1.
- **Context:** Branch master data is organization-wide, while the existing role
  matrix already separates organization reading from organization management.
  Later purchases, stock movements, production, sales checkpoints and closings
  will reference a branch, so deleting the row would either destroy history or
  require cascades that are not part of the confirmed model.
- **Decision:** Branch listing uses `organization:read`; creating and editing a
  branch uses `organization:manage`. There is no hard-delete endpoint. The edit
  operation changes the name and `isActive` flag, and inactive branches are
  hidden by the reusable selector unless a caller explicitly includes them.
- **Alternatives considered:** Use `inventory:write` for branch writes; rejected
  because a branch is organization master data, not an inventory transaction.
  Hard-delete branches; rejected because operational history must retain its
  branch reference. Add a new branch-specific permission; rejected as premature
  before branch-scoped access exists (BQ-09).
- **Consequences:** Only administrators can create or edit branches today. Other
  roles can read the list and use branch selectors. If the central operator needs
  branch administration, the account needs `organization:manage` or a deliberate
  permission change later. Branch names are unique per organization and a
  duplicate is reported as a domain conflict.

### TD-012 — Employees are branch-owned master data, deactivated rather than deleted

- **Date:** 2026-11-09
- **Status:** ACCEPTED for M2-T2; branch sharing remains open (BQ-20).
- **Context:** Later production records must identify who prepared a product.
  That person is not an application user and does not need a login. The proposed
  domain model places an employee in one branch, but the business has not
  confirmed whether an employee may work across branches.
- **Decision:** Store an employee with an organization, one branch, a trimmed full
  name and an active flag. Listing uses `organization:read`; create and update use
  `organization:manage`. Create and update verify that the branch belongs to the
  caller's organization. Employees are deactivated, never hard-deleted. Names are
  not unique. No account, contact, payroll, attendance or transfer-history fields
  are added.
- **Alternatives considered:** Make employees organization-wide and add a
  user-branch join table now; rejected as premature while BQ-20 is unanswered and
  because the proposed model starts branch-local. Delete employees; rejected
  because later production rows need the preparer reference. Reuse application
  users as employees; rejected because BR-008 says branch employees do not log in.
- **Consequences:** M5 can reference an employee as the preparer. If employees
  must be shared across branches later, a join table or an ownership change will
  need an explicit migration rather than a silent reinterpretation of
  `employee.branchId`.

### TD-013 — Suppliers are organization-wide master data, deactivated rather than deleted

- **Date:** 2026-11-09
- **Status:** ACCEPTED for M2-T3; supplier detail fields remain open (BQ-21).
- **Context:** M3 purchases must identify the supplier that delivered each
  branch's goods. A supplier is normally the same legal counterparty regardless
  of which branch receives the delivery, and the purchase itself already carries
  the branch. No confirmed requirement exists for supplier contacts, tax
  identifiers, payment terms or accounts payable.
- **Decision:** Store a supplier with an organization, a trimmed name and an
  active flag. Suppliers are organization-wide; they have no `branchId`. Listing
  uses `organization:read`; create and update use `organization:manage`.
  Suppliers are deactivated, never hard-deleted. Names are not unique because two
  suppliers may legitimately share a trade name; identity is the supplier id. No
  contact, address, tax, payment-term or accounts-payable fields are added.
- **Alternatives considered:** Make suppliers branch-owned; rejected because the
  same supplier can deliver to multiple branches and the purchase already records
  the branch. Make names unique; rejected because it invents a constraint the
  business has not confirmed. Add contact and payment fields now; deferred until
  M3 or payables confirms them (BQ-21). Delete suppliers; rejected because later
  purchases must keep their supplier reference.
- **Consequences:** M3 can reference a supplier without duplicating it per
  branch. Extra supplier details require an explicit schema and migration change
  after BQ-21 is answered. Administrators manage suppliers today; other roles can
  read them and use supplier selection in later purchase forms.

### TD-014 — Catalog master data uses explicit business keys; the presentation editor lands with the product screen

- **Date:** 2026-11-12
- **Status:** ACCEPTED for M2-T4.
- **Context:** Product management in M2-T5 needs stable categories and units, and
  presentations need a product before they can be edited. The existing catalog
  tables already define unique keys: category name per organization, unit code
  per organization and presentation name per product. The repository and API
  previously supported create/list only, while Settings already hosts the other
  organization-wide master data.
- **Decision:** Expose category and unit management in Settings and enforce the
  existing unique keys through organization-scoped lookups before create/update,
  with duplicate values reported as a domain conflict. Reads use
  `organization:read`; writes use `organization:manage`. Categories, units and
  presentations are deactivated, never hard-deleted. Presentation create/list/
  update is available through the API and typed client, but its editor is
  deferred to the M2-T5 product screen because a presentation is always scoped to
  a selected product.
- **Alternatives considered:** Build a standalone presentation screen with a
  product picker; rejected because it duplicates the M2-T5 product workflow and
  would be replaced immediately. Add new permissions or branch ownership for
  catalog data; rejected because catalog master data is organization-wide
  (TD-009) and the existing administration boundary is sufficient. Hard-delete
  catalog rows; rejected because products and future operational records need
  stable references.
- **Consequences:** Category names and unit codes identify catalog rows within an
  organization; presentation identity is product plus name. M2-T5 owns the
  product and presentation UI, including active/inactive selection. Concurrent
  creates can still reach the database unique constraint after the pre-check, so
  the existing TD-10 risk applies to catalog rows too. No migration or catalog
  seed is required by this decision.

### TD-015 — Products use a dedicated screen; presentation editing is exposed for processed products

- **Date:** 2026-11-12
- **Status:** ACCEPTED for M2-T5.
- **Context:** M2-T5 needs product list/create/edit and the presentation editor
  deferred from M2-T4. Product management is an operational catalog workflow,
  larger than the Settings master-data sections, and presentations only make
  sense for a selected product. The API already exposes presentations for every
  product kind.
- **Decision:** Put product management on a dedicated `/products` primary-nav
  route rather than inside Settings. Products use the normal
  `organization:read`/`organization:manage` boundary and organization-scoped
  category/unit reference validation. Product names are not unique, and the
  raw/processed kind remains editable. The product screen exposes the nested
  presentation editor only for `PROCESSED` products. The API keeps presentations
  product-scoped without a kind restriction.
- **Alternatives considered:** Put products in Settings with the other master
  data; rejected because the product list is an operational workflow with nested
  presentation management and would overload the Settings screen. Add a backend
  restriction that only processed products may have presentations; rejected
  because the business has not confirmed that restriction and the existing API
  contract is product-scoped. Make product names unique; rejected because two
  products may legitimately share a name and no requirement confirms uniqueness.
  Build a separate presentation screen; rejected because it would duplicate the
  product workflow (TD-014).
- **Consequences:** The product screen owns product and presentation maintenance.
  Users can still read or write presentations for any product through the API;
  only the UI action is limited to processed products. Inactive categories and
  units remain selectable when editing a product that already references them.
  No schema, migration or seed is required by this decision.

### TD-016 — Selling prices are append-only, effective-dated snapshots

- **Date:** 2026-11-12
- **Status:** ACCEPTED for M2-T6; branch scope remains open (BQ-06).
- **Context:** M2-T6 needs a selling price for raw products per sales unit and for
  processed products per kilogram, while preserving every past price for later
  sales checkpoints and closing cost calculations. The business has not confirmed
  whether prices are organization-wide or branch-specific (BQ-06), and unit
  conversion remains unresolved (BQ-10).
- **Decision:** Store `product_price_history` rows with organization, product,
  integer `amountMinor`, captured currency, captured price basis, ISO effective
  date and creation time. A price change appends a new row; existing rows are
  never updated or deleted. Effective end is inferred from the next row. The
  basis is derived from the product kind at creation (`PROCESSED` =
  `PER_KILOGRAM`, `RAW` = `PER_SALES_UNIT`) and then stored so later kind changes
  cannot reinterpret history. Currency is captured from the organization at
  creation. Effective date is unique per product. Reads use `organization:read`;
  writes use `organization:manage`.
- **Alternatives considered:** Overwrite one current price on the product;
  rejected because past sales and closing records would lose their price.
  Store effective-to as well as effective-from; rejected because it duplicates
  information and permits overlapping intervals. Read the current product kind
  when displaying an old price; rejected because editing a product from raw to
  processed would silently change the meaning of its history. Make prices
  branch-specific now; deferred because BQ-06 is unanswered, and the
  organization product id can be extended with a scope later. Convert units in
  the price row; rejected while BQ-10 is unresolved.
- **Consequences:** M6/M7 can select the price in effect on a business date and
  retain the exact basis and currency used. Corrections are new effective-dated
  rows, not edits. If BQ-06 confirms branch-specific prices, a scope column and
  migration must be added explicitly rather than changing existing history.
  Average weight remains presentation master data; historical weight snapshots
  belong to later production/sales records (BR-018, BR-019).

### TD-017 — Purchases are received once in full and reversed through an audited correction

- **Date:** 2026-11-13
- **Status:** ACCEPTED for M3; partial receiving, taxes, freight, unit conversion
  and shared deliveries remain open (BQ-10, BQ-13, BQ-14, BQ-15).
- **Context:** M3 registers supplier deliveries per branch and must change stock
  only on confirmed receiving. A purchase may contain several products at
  different quantities and prices, and its line prices must remain available for
  later cost calculations. The business selected a correction path with an audit
  record and stock compensation rather than silent edits; partial receiving,
  taxes and freight were explicitly excluded from M3.
- **Decision:** Store purchases with organization and branch ownership, one
  supplier, a delivery date, captured currency, integer minor-unit totals and
  immutable line items. Quantities use integer thousandths. A purchase starts as
  `DRAFT`; receiving is one `DRAFT -> RECEIVED` transition that appends one
  `RECEIVING` stock movement per line and cannot run twice. Drafts may be
  cancelled. Received purchases are corrected through a `purchase_corrections`
  row with actor, required reason and before/after totals, plus one compensating
  `CORRECTION` movement per receipt movement; the purchase becomes `CORRECTED`.
  The correction is a full reversal (`afterTotalMinor = 0`), and at most one
  correction is stored per purchase. Reads use `inventory:read`; creation,
  receiving, cancellation and correction use `inventory:write`. A line unit must
  equal the product inventory unit until unit conversion is supported.
- **Alternatives considered:** Allow partial receipts; rejected for M3 because a
  delivery is entered as one confirmed purchase and receipt state per line would
  add unconfirmed complexity (BQ-15). Edit a received purchase in place;
  rejected because it would rewrite price history and provide no audit trail.
  Delete a received purchase and recreate it; rejected because stock and price
  history would lose their source. Reverse and immediately create a replacement
  purchase automatically; rejected because the replacement lines are business
  input and are not confirmed by a correction reason. Store purchase prices in a
  separate history table; rejected because received purchase items are already
  immutable and preserve the same information. Convert purchase units to inventory
  units now; rejected while BQ-10 is unresolved.
- **Consequences:** M4 can build balances from the persisted movement ledger
  without changing M3's receiving records. A correction reverses the whole
  purchase; a revised purchase must be entered explicitly after the correction.
  Purchase price history is the set of received items, including corrected
  purchases. If partial receiving, taxes, freight, unit conversion or a
  branch-shared delivery is confirmed, each requires an explicit schema,
  workflow and migration change rather than reinterpretation of existing rows.

### TD-018 — Branch stock is a derived exact ledger; adjustments, waste and reconciliation are audited

- **Date:** 2026-11-15
- **Status:** ACCEPTED and implemented in M4; unit conversion, transfers and
  negative-stock overrides remain open (BQ-10, BQ-12). Cost valuation was
  resolved in M7 as latest received purchase price (ADR 0044, TD-021).
- **Context:** M3 receiving and purchase corrections already append stock
  movements, but M4 must expose branch stock, adjust it, record waste and
  reconcile physical counts. BQ-07 and BQ-08 needed a decision before a table
  shape or UI could be built. Purchase quantities are exact integer thousandths,
  while `stock_movements.quantity_delta` was still floating point (TD-11).
- **Decision:** Balances are derived by summing append-only movements, scoped by
  organization and branch. Movement quantities use integer thousandths
  (`quantity_delta_milli`), and M3 rows are converted in migration `0009`. There
  is no balance cache table in M4. Manual adjustments, waste and reconciliation
  create ordinary stock movements with reason `ADJUSTMENT` or `WASTE`; each has
  its own entity row with actor, required reason, occurrence time and optional
  note. Waste stores a positive quantity and posts a negative movement. A
  reconciliation stores the expected and counted quantities plus an adjustment
  kind; it posts a movement only when the difference is non-zero. Any operation
  that would leave a negative balance is refused with `INSUFFICIENT_STOCK`; M4
  provides no override. Negative quantities and zero manual adjustments are
  invalid. Inactive branches and products are rejected for new inventory
  operations. Reads use `inventory:read`; all writes use `inventory:write`.
- **Alternatives considered:** Maintain a `stock_balances` cache; rejected
  because it creates a second source of truth before performance requires it.
  Allow negative stock with a warning; rejected because it hides receiving
  mistakes and makes closing unreconcilable. Record reconciliation only as a
  movement; rejected because the count evidence would be lost. Keep floating
  quantities; rejected because exact thousandths already exist and drift is
  unacceptable in the ledger. Give waste its own signed quantity; rejected
  because the direction is always negative and a positive entry is less
  error-prone.
- **Consequences:** Balance reads aggregate movements with a composite index on
  organization, branch and product. Purchase corrections must check the derived
  balance before posting compensating movements. A zero balance does not imply
  that no movements exist. A future cache or negative-stock override needs an
  explicit decision and migration rather than reinterpreting these rows.

### TD-019 — Production batches snapshot tray weight and post one net movement per product

- **Date:** 2026-11-15
- **Status:** ACCEPTED and implemented in M5; recipes, partial corrections and
  production valuation remain open (BQ-11, BQ-12).
- **Context:** M5 records branch tray production on top of the M4 ledger. The
  batch must preserve the preparer, operator, presentation and average weight
  used at that time, while product presentations remain editable master data.
  Raw consumption is optional when reliable, and waste must affect stock
  separately. M6 and M7 will reuse the recorded weights.
- **Decision:** Store batches with branch, business date, preparer employee,
  registering user, note and `DRAFT | CONFIRMED | CORRECTED` status. Outputs
  snapshot the presentation, `averageWeightPerTrayGrams` and
  `estimatedWeightGrams = trayCount × averageWeight`, with optional
  `measuredWeightGrams` and an `ESTIMATED | MEASURED` basis. Grams map 1:1 to
  milli-kilograms. Inputs require active `RAW` products and the product inventory
  unit; outputs require active `PROCESSED` products; waste may reference any
  active product. Confirmation aggregates the net delta per product and appends
  movements with source `PRODUCTION_BATCH` and reasons `PRODUCTION_INPUT`,
  `PRODUCTION_OUTPUT` and `WASTE`; negative resulting stock is refused. A
  correction is a single audited full reversal with `CORRECTION` movements linked
  to the originals, actor, time and required reason; drafts can be discarded.
  Reads use `inventory:read`; writes use `inventory:write`.
- **Alternatives considered:** Read the current presentation weight when
  displaying history; rejected because edits would change past production.
  Store only estimated weight; rejected because tray count and the per-tray
  snapshot are the reported evidence. Edit a confirmed batch; rejected because
  it rewrites ledger history. Require input lines; rejected because consumption
  is recorded only when reliable. Allow repeated corrections; rejected for M5
  because it needs a new reversal-of-reversal model.
- **Consequences:** Production and correction must be transactional with
  movement writes. Later presentation edits cannot alter historical batches.
  Sales checkpoints and closing can reuse snapshots. Recipes, partial
  corrections and valuation require an explicit future decision, schema and
  migration.

### TD-020 — Sales checkpoints snapshot weight and price and post one net movement per line

- **Date:** 2026-11-16
- **Status:** ACCEPTED and implemented in M6; BR-013 reporting fields, BQ-02
  period configuration, BQ-17 no-sales behavior and BQ-10 unit conversion remain
  open.
- **Context:** M6 records aggregate branch sales on top of the M4 ledger. The
  business may report processed products in trays and raw products in their sales
  units. Presentations and effective-dated prices can change later, so a
  confirmed checkpoint must preserve the weight and price used at that time.
  BR-013 has not confirmed the final WhatsApp message contract.
- **Decision:** Store checkpoints with branch, business date,
  `MORNING | EVENING` period, registering user, note and
  `DRAFT | CONFIRMED | CORRECTED` status; branch/date/period is unique. Require
  at least one line. Raw lines use a positive quantity, reject tray/weight
  fields, require their sales unit to equal the inventory unit and use
  `NOT_APPLICABLE` weight basis. Processed lines require a presentation and
  positive tray count, snapshot the average tray weight, derive estimated grams
  and use an optional measured weight; `quantityMilli` is measured or estimated
  grams with an `ESTIMATED | MEASURED` basis. Every line snapshots the newest
  selling price effective on or before the business date with its amount, basis
  and currency. `estimatedSalesValueMinor` uses integer rounding
  `floor((quantityMilli × amountMinor + 500) / 1000)`. Confirmation appends
  negative `SALES_CHECKPOINT` movements and refuses negative stock; correction is
  one audited full reversal with linked `CORRECTION` movements. Reads use
  `inventory:read`; writes use `inventory:write`.
- **Alternatives considered:** Recompute prices and weights at display time;
  rejected because master-data edits would rewrite history. Allow raw sales in a
  unit different from inventory; rejected while BQ-10 is unresolved. Add a
  no-sales marker; rejected until BQ-17 confirms the reporting rule. Permit
  repeated corrections; rejected because it needs a reversal-of-reversal model.
- **Consequences:** Checkpoint history is stable and M7 can consume it for
  revenue. Confirmation and correction must be transactional with movement
  writes. The WhatsApp reporting layer and period configuration still require
  product confirmation before they are final.

### TD-021 — Daily closings snapshot the day and reopen as a new version

- **Date:** 2026-11-16
- **Status:** ACCEPTED and implemented in M7; BQ-16 business-day boundaries,
  BQ-10 unit conversion, BQ-02 periods and BR-013 reporting remain open.
- **Context:** M7 consolidates branch purchases, production, sales, waste,
  inventory differences and remaining stock. The sources are append-only or
  already snapshotted, but prices and master data can change later. The business
  confirmed latest received purchase price as the estimated cost basis.
  Confirmed closings must remain reviewable and auditable.
- **Decision:** Store one row per organization/branch/business date/version and
  item rows keyed by product. The current closing is the highest version.
  Statuses are `DRAFT | REVIEWED | CONFIRMED | REOPENED`; only a confirmed
  closing can be reopened, with a required reason. Reopening marks the old row
  `REOPENED` and creates a new `DRAFT` version linked by `previousClosingId`
  instead of editing snapshots. Day bounds are local midnight in the
  organization timezone. Opening stock and movement categories come from the
  ledger; revenue comes from confirmed sales-checkpoint snapshots; purchases,
  production and waste counts come from their source rows. Cost uses the latest
  received purchase for the product in the branch with
  `deliveryDate <= businessDate`, ordered by delivery date, received time and
  purchase id, and only when its unit equals the item unit. Missing cost is
  `UNAVAILABLE` with zero cost and a `missingCostProductCount` warning.
  Cost of sales uses `floor((quantityMilli × unitPriceMinor + 500) / 1000)`.
  Negative closing stock and missing sources are warnings, not creation
  blockers. Reads use `inventory:read`; mutations use `inventory:write`.
- **Alternatives considered:** Recompute closings from current records; rejected
  because history would change. Mutate a confirmed closing on reopen; rejected
  because it erases the reviewed evidence. Refuse creation when data is missing;
  rejected because the operator needs to see the gaps. Use weighted average,
  FIFO or manual cost; rejected by the confirmed M7 cost basis. Convert units;
  rejected while BQ-10 is unresolved.
- **Consequences:** Confirmed versions stay immutable and corrections appear as
  a new version. Cost and profit remain estimates and must be labeled. Mismatched
  units surface as missing cost instead of a guessed conversion. Branch
  timezones and non-midnight business days need a future decision.

### TD-022 — Dashboard reports are computed on demand from source records

- **Date:** 2026-11-17
- **Status:** ACCEPTED for M8; BR-013/BQ-02/BQ-10/BQ-14/BQ-16/BQ-17 remain open.
- **Context:** M8 needs consolidated and branch-filtered reports over ranges,
  daily/weekly/monthly periods, estimated profitability and CSV export. The
  evidence already exists in confirmed checkpoints and batches, received
  purchases, the stock ledger, waste records and daily closings. Persisting
  another report snapshot would create a second source of truth.
- **Decision:** Define one `ReportRepository.readSources(...)` port with SQLite
  and PostgreSQL implementations and a pure `buildReport(...)` domain function.
  `GET /api/v1/reports/summary` requires `from`, `to`, optional `branchId` and
  `granularity` (`day | week | month`, default `day`), and `reports:read`.
  Totals aggregate confirmed checkpoints/batches, received purchases, ledger
  balance and both waste sources; cost reuses the M7 latest-purchase rule with
  same-unit guard and missing-cost count. Periods use the organization timezone,
  weeks start Monday and months start on the first day. CSV is generated by the
  app and saved through the platform abstraction, with money scaled by the
  captured currency's fraction digits. No report tables, views or migrations are
  added.
- **Alternatives considered:** Persist materialized report tables; rejected as
  premature dual-engine state. Reuse only daily closings; rejected because they
  are branch/day/version scoped and cannot cover arbitrary ranges or all source
  records. Generate CSV in the API; rejected because `saveFile` already provides
  a web/desktop boundary. Scale all minor units by 100; rejected because the
  currency fraction digits are explicit.
- **Consequences:** Reports reflect current source rows rather than immutable
  period snapshots; closings remain the immutable daily record. Profit stays
  explicitly estimated. Cost mismatches remain visible instead of guessed.
  Range-query performance needs measuring in M9 before adding indexes or
  materialization. Final WhatsApp fields and period rules remain blocked on the
  open questions.
- **ADR:** [0045 — Reports are computed on demand from source records](../decisions/0045-reports-computed-from-source-records.md).
