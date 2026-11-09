# Current State — superseded pointer

> This file used to be the resume point. The canonical documents are now:
>
> - [IMPLEMENTATION_PROGRESS.md](../development/IMPLEMENTATION_PROGRESS.md)
> - [CURRENT_TASK.md](../development/CURRENT_TASK.md)
> - [SESSION_LOG.md](../development/SESSION_LOG.md)
> - [IMPLEMENTATION_ROADMAP.md](../development/IMPLEMENTATION_ROADMAP.md)

## Current status

- **Foundation prerequisite:** complete.
- **Business roadmap:** M1 is COMPLETED; M2–M9 are NOT_STARTED.
- **Branch foundation:** entity, dual-engine schema, migrations and repositories
  are implemented. No branch API route or UI exists yet.
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
  references describe M1. The boundary guard checks dependency direction,
  database access, thin shells, domain Node built-ins, schema-table parity and
  migration-journal parity.
- **Next task:** start M2 with branch CRUD and the branch selector foundation;
  branch seeding waits for BQ-19.
- **Pending commit:** the M1-T5/M1-T6 changes are uncommitted pending
  authorization.

The previous foundation verification record is preserved in
[SESSION_LOG.md](../development/SESSION_LOG.md) (Sessions 0–8).
[LOG.md](./LOG.md) remains as a pointer to that history.
