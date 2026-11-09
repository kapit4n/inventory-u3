# Current State — superseded pointer

> This file used to be the resume point. The canonical documents are now:
>
> - [IMPLEMENTATION_PROGRESS.md](../development/IMPLEMENTATION_PROGRESS.md)
> - [CURRENT_TASK.md](../development/CURRENT_TASK.md)
> - [SESSION_LOG.md](../development/SESSION_LOG.md)
> - [IMPLEMENTATION_ROADMAP.md](../development/IMPLEMENTATION_ROADMAP.md)

## Current status

- **Foundation prerequisite:** complete.
- **Business roadmap:** M1 is COMPLETED; M2 is IN_PROGRESS (branch slice
  complete); M3–M9 are NOT_STARTED.
- **Branch master data:** entity, dual-engine schema, migrations and repositories
  are implemented. `GET/POST/PUT /api/v1/branches`, the Settings management
  section and the reusable active-branch selector are implemented. The three
  real branches remain unseeded until BQ-19 is answered.
- **Catalog identity:** units, categories, products and presentations have
  domain + dual-engine persistence. Products carry a raw/processed kind and
  presentations carry an average weight per tray. No API route, UI, prices or
  weight snapshots exist yet.
- **Stock concepts:** append-only movement, reason, source, correction and
  balance shapes exist in the domain only. No stock table, repository, API or
  balance calculation exists yet.
- **Access model:** documented in `docs/project/ACCESS_MODEL.md`; one
  organization-wide central operator initially. Branch users and assignment
  tables remain unimplemented.
- **Technical docs and guard:** the database, backend, testing and architecture
  references describe M1 and M2-T1. The boundary guard checks dependency
  direction, database access, thin shells, domain Node built-ins, schema-table
  parity and migration-journal parity.
- **Next task:** continue M2 with the next master-data slice; employee master data
  is next in the roadmap. Branch seeding waits for BQ-19.
- **M1 closeout commit:** `bfdc9cb`. M2-T1 is currently uncommitted in the working
  tree.

The previous foundation verification record is preserved in
[SESSION_LOG.md](../development/SESSION_LOG.md) (Sessions 0–9).
[LOG.md](./LOG.md) remains as a pointer to that history.
