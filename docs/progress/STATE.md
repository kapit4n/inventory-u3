# Current State — superseded pointer

> This file used to be the resume point. The canonical documents are now:
>
> - [IMPLEMENTATION_PROGRESS.md](../development/IMPLEMENTATION_PROGRESS.md)
> - [CURRENT_TASK.md](../development/CURRENT_TASK.md)
> - [SESSION_LOG.md](../development/SESSION_LOG.md)
> - [IMPLEMENTATION_ROADMAP.md](../development/IMPLEMENTATION_ROADMAP.md)

## Current status

- **Foundation prerequisite:** complete.
- **Business roadmap:** M1–M5 are COMPLETED; M6 is IMPLEMENTED but uncommitted;
  M7–M9 are NOT_STARTED.
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
- **Access model:** documented in `docs/project/ACCESS_MODEL.md`; one
  organization-wide central operator initially. Branch users and assignment
  tables remain unimplemented.
- **Technical docs and guard:** the database, backend, testing and architecture
  references describe M1 through M5. The boundary guard checks dependency
  direction, database access, thin shells, domain Node built-ins, schema-table
  parity and migration-journal parity.
- **Next task:** resolve BR-013, then start M6 sales checkpoints. Real branch
  names wait for BQ-19; real master data replaces the sample seed when confirmed.
- **Commits:** M1 closeout `bfdc9cb`; M2-T1 `814f397`; M2-T2 `6b50606`; M2-T3
  `5c96eeb`; M2-T4 `992d6ea`; M2-T5 `c8526d0`; M2-T6/T7 with the sample seed
  `cc70bfc`; M3 `13b8fcd`; M3 docs closeout `c86c6c5`; M4 `8f5f326`; M5
  `7441653`.

The previous verification records are preserved in
[SESSION_LOG.md](../development/SESSION_LOG.md) (Sessions 0–19).
[LOG.md](./LOG.md) remains as a pointer to that history.
