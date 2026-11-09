# Current State — superseded pointer

> This file used to be the resume point. The canonical documents are now:
>
> - [IMPLEMENTATION_PROGRESS.md](../development/IMPLEMENTATION_PROGRESS.md)
> - [CURRENT_TASK.md](../development/CURRENT_TASK.md)
> - [SESSION_LOG.md](../development/SESSION_LOG.md)
> - [IMPLEMENTATION_ROADMAP.md](../development/IMPLEMENTATION_ROADMAP.md)

## Current status

- **Foundation prerequisite:** complete.
- **Business roadmap:** M1 is IN_PROGRESS; M2–M9 are NOT_STARTED.
- **Branch foundation:** entity, dual-engine schema, migrations and repositories
  are implemented. No branch API route or UI exists yet.
- **Catalog identity:** units, categories, products and presentations have
  domain + dual-engine persistence. Products carry a raw/processed kind and
  presentations carry an average weight per tray. No API route, UI, prices or
  weight snapshots exist yet.
- **Stock concepts:** append-only movement, reason, source, correction and
  balance shapes exist in the domain only. No stock table, repository, API or
  balance calculation exists yet.
- **Next task:** M1-T5 — access model note for the central operator now and
  future branch users later.

The previous foundation verification record is preserved in
[SESSION_LOG.md](../development/SESSION_LOG.md) (Sessions 0–6).
[LOG.md](./LOG.md) remains as a pointer to that history.
