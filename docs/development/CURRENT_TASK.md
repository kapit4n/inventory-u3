# Current Task

> Last updated: 2026-11-09.
>
> **M1-T6 is complete. M1 is complete.** The next task is the first M2 slice
> (branch CRUD and selector foundation), not started. The M1 closeout is committed
> as `bfdc9cb`.

## Task identity

| Field        | Value                                          |
| ------------ | ---------------------------------------------- |
| Milestone    | M1 completed; next is M2 — Master Data         |
| Task ID      | M1-T6 completed; next M2 branch CRUD slice     |
| Task         | Close out M1 technical docs and boundary guard |
| Status       | M1-T6 COMPLETED; M2 NOT_STARTED                |
| Dependencies | M1-T1 to M1-T5 complete                        |
| Blocks       | None; M1 is complete and M2 is next            |

## Objective

Make the technical reference documents describe the domain that is actually
implemented, and make the automated boundary guard enforce the dual-engine and
domain-purity rules that M1 relies on.

## Scope completed

- Reconciled `docs/database.md` with the branch and catalog tables, both schema
  trees, both migration journals and the current seed state.
- Updated `docs/backend.md`, `docs/testing.md` and `docs/architecture.md` where
  they still described only the original organization foundation.
- Extended `scripts/check-boundaries.mjs` to reject:
  - Node built-ins imported by shipped `packages/domain` code;
  - a table declared in only one schema tree;
  - a migration journal with a different entry count.
- Kept the existing dependency-direction, database-access and thin-shell rules.
- Updated progress, roadmap, state, known issues and the session log.

## Acceptance criteria

- [x] `docs/database.md` lists every current table and both migration journals.
- [x] Technical docs no longer claim the database has only three tables.
- [x] The boundary guard rejects a one-engine table or migration-journal change.
- [x] The boundary guard rejects Node built-in imports from shipped domain code.
- [x] `guard:boundaries`, `typecheck`, `lint`, `test`, `build`, `format:check`
      and the Markdown link check pass.
- [x] No domain, schema, migration, API or UI behavior changes.

## Next task

Start M2 with branch CRUD and the branch selector foundation. Do not seed the
three branches until their names and codes are confirmed (BQ-19). Do not start
purchases, stock or production in M2.

The M1-T5 and M1-T6 changes are committed as `bfdc9cb`; M2 may begin.
