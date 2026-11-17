# Current State — superseded pointer

> This file used to be the resume point. The canonical documents are now:
>
> - [IMPLEMENTATION_PROGRESS.md](../development/IMPLEMENTATION_PROGRESS.md)
> - [CURRENT_TASK.md](../development/CURRENT_TASK.md)
> - [SESSION_LOG.md](../development/SESSION_LOG.md)
> - [IMPLEMENTATION_ROADMAP.md](../development/IMPLEMENTATION_ROADMAP.md)

## Current status

- **Foundation prerequisite:** complete.
- **Business roadmap:** M1–M7 are COMPLETED; M8 is complete and verified,
  pending commit; M9 is NOT_STARTED.
- **Branch master data:** entity, dual-engine schema, migrations and repositories
  are implemented. `GET/POST/PUT /api/v1/branches`, the Settings management
  section and the reusable active-branch selector are implemented. Three
  illustrative branches are seeded; their real names await BQ-19.
- **Employee master data:** entity with organization and branch ownership,
  dual-engine schema/migrations, repositories, `GET/POST/PUT /api/v1/employees`,
  typed client, Settings management and tests are implemented. Employees are
  deactivated, not deleted. No accounts or seed data exist; branch sharing remains
  open (BQ-20). The sample seed adds four illustrative employees.
- **Supplier master data:** organization-wide entity, dual-engine
  schema/migrations, repositories, `GET/POST/PUT /api/v1/suppliers`, typed client,
  Settings management and tests are implemented. Suppliers are deactivated, not
  deleted; names are not unique. The sample seed adds three suppliers; extra
  contact, tax or payment fields remain open (BQ-21, TD-013).
- **Catalog and product master data:** units, categories, products and
  presentations have domain, dual-engine persistence, API routes, typed client,
  UI and tests. Category and unit management is in Settings; products use
  `/products`, read-only for non-administrators. Products carry a raw/processed
  kind and presentations carry an average weight per tray; processed products
  open the presentation editor from the product screen. Effective-dated,
  append-only selling-price history is implemented on both engines, in the API,
  client and product screen. The sample seed adds illustrative categories,
  products, presentations and prices. Weight snapshots do not exist yet.
- **Purchases and receiving:** multi-line draft purchases, one-shot receiving
  into append-only stock movements, cancellation and audited full reversals are
  implemented on both engines, in the API, typed client and `/purchases` UI.
  Partial receiving, taxes, freight and unit conversion remain open (BQ-10,
  BQ-13, BQ-14, BQ-15). M3 is committed as `13b8fcd`.
- **Branch inventory:** balances are derived from the append-only ledger with
  exact integer-thousandth movements. Manual adjustments, positive waste,
  physical-count reconciliation, negative-stock refusal, authenticated inventory
  routes, typed client and the `/inventory` UI are implemented on both engines.
  No balance cache table exists (ADR 0041, TD-018). M4 is committed as
  `8f5f326`. The development seed adds illustrative opening balances, waste and
  reconciliation rows for all three branches.
- **Production:** branch batches record the preparer, registering operator,
  business date, tray counts, average-weight snapshots, optional measured weight,
  optional raw inputs and explicit waste. Confirmation writes one net movement
  per product to the ledger and refuses negative stock; a confirmed batch can be
  fully reversed once through an audited correction. The `/production` UI, API,
  typed client, dual-engine persistence and tests are implemented (ADR 0042,
  TD-019). M5 is committed as `7441653`.
- **Sales checkpoints:** aggregate branch/date/period checkpoints snapshot
  weight and effective selling price, confirm into the stock ledger and support
  one audited reversal. `/sales-checkpoints`, API/client and dual-engine
  persistence are implemented (ADR 0043, TD-020); BR-013/BQ-02/BQ-17 remain open.
  M6 is committed as `52e39a3`.
- **Daily closing:** versioned branch/day snapshots consolidate purchases,
  production, sales, waste, inventory differences and stock. Cost uses the
  latest received purchase price, missing cost is flagged and reopening creates
  a new draft version. `/daily-closings`, API/client and dual-engine persistence
  are implemented (ADR 0044, TD-021); BQ-16/BQ-10/BQ-14 remain open. M7 is
  committed as `e04bafa`.
- **Dashboard and reports:** `/dashboard` now shows on-demand consolidated
  reports with date, branch and day/week/month filters, estimated profit and CSV
  export. One domain builder and repository port are implemented on both engines
  (ADR 0045, TD-022). BR-013/BQ-02/BQ-10/BQ-14/BQ-16/BQ-17 remain open. M8 is
  verified and pending commit.
- **Access model:**
  documented in `docs/project/ACCESS_MODEL.md`; one
  organization-wide central operator initially. Branch users and assignment
  tables remain unimplemented.
- **Technical docs and guard:** the database, backend, testing and architecture
  references describe M1 through M8. The boundary guard checks dependency
  direction, database access, thin shells, domain Node built-ins, schema-table
  parity and migration-journal parity.
- **Next task:** commit M8, then start M9 quality, permissions and operational
  hardening. Real branch names wait for BQ-19; real master data replaces the
  sample seed when confirmed.
- **Commits:** M1 closeout `bfdc9cb`; M2-T1 `814f397`; M2-T2 `6b50606`; M2-T3
  `5c96eeb`; M2-T4 `992d6ea`; M2-T5 `c8526d0`; M2-T6/T7 with the sample seed
  `cc70bfc`; M3 `13b8fcd`; M3 docs closeout `c86c6c5`; M4 `8f5f326`; M5
  `7441653`; M6 `52e39a3`; M6 seed `8382e54`; M7 `e04bafa`. M8 is verified and
  pending commit.

The previous verification records are preserved in
[SESSION_LOG.md](../development/SESSION_LOG.md) (Sessions 0–19).
[LOG.md](./LOG.md) remains as a pointer to that history.
