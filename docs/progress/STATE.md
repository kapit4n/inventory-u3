# Current State — superseded pointer

> This file used to be the resume point. The canonical documents are now:
>
> - [IMPLEMENTATION_PROGRESS.md](../development/IMPLEMENTATION_PROGRESS.md)
> - [CURRENT_TASK.md](../development/CURRENT_TASK.md)
> - [SESSION_LOG.md](../development/SESSION_LOG.md)
> - [IMPLEMENTATION_ROADMAP.md](../development/IMPLEMENTATION_ROADMAP.md)

## Current status

- **Foundation prerequisite:** complete.
- **Business roadmap:** M1 is COMPLETED; M2 is IN_PROGRESS (branch, employee,
  supplier, catalog and product slices complete); M3–M9 are NOT_STARTED.
- **Branch master data:** entity, dual-engine schema, migrations and repositories
  are implemented. `GET/POST/PUT /api/v1/branches`, the Settings management
  section and the reusable active-branch selector are implemented. The three
  real branches remain unseeded until BQ-19 is answered.
- **Employee master data:** entity with organization and branch ownership,
  dual-engine schema/migrations, repositories, `GET/POST/PUT /api/v1/employees`,
  typed client, Settings management and tests are implemented. Employees are
  deactivated, not deleted. No accounts or seed data exist; branch sharing remains
  open (BQ-20).
- **Supplier master data:** organization-wide entity, dual-engine
  schema/migrations, repositories, `GET/POST/PUT /api/v1/suppliers`, typed client,
  Settings management and tests are implemented. Suppliers are deactivated, not
  deleted; names are not unique. No seed data exists and extra contact, tax or
  payment fields remain open (BQ-21, TD-013).
- **Catalog and product master data:** units, categories, products and
  presentations have domain, dual-engine persistence, API routes, typed client,
  UI and tests. Category and unit management is in Settings; products use
  `/products`, read-only for non-administrators. Products carry a raw/processed
  kind and presentations carry an average weight per tray; processed products
  open the presentation editor from the product screen. No prices, weight
  snapshots or catalog/product seed data exist yet.
- **Stock concepts:** append-only movement, reason, source, correction and
  balance shapes exist in the domain only. No stock table, repository, API or
  balance calculation exists yet.
- **Access model:** documented in `docs/project/ACCESS_MODEL.md`; one
  organization-wide central operator initially. Branch users and assignment
  tables remain unimplemented.
- **Technical docs and guard:** the database, backend, testing and architecture
  references describe M1 and M2-T1 through M2-T5. The boundary guard checks
  dependency direction, database access, thin shells, domain Node built-ins,
  schema-table parity and migration-journal parity.
- **Next task:** continue M2 with average-weight and selling-price configuration
  with history (M2-T6). Branch seeding waits for BQ-19; employee, supplier and
  catalog/product seed data waits for real master data.
- **Commits:** M1 closeout `bfdc9cb`; M2-T1 `814f397`; M2-T2 `6b50606`; M2-T3
  `5c96eeb`; M2-T4 `992d6ea`. M2-T5 is verified and uncommitted.

The previous verification records are preserved in
[SESSION_LOG.md](../development/SESSION_LOG.md) (Sessions 0–13).
[LOG.md](./LOG.md) remains as a pointer to that history.
