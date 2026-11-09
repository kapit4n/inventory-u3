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
