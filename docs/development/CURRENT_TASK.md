# Current Task

> Last updated: 2026-11-12.
>
> **M2-T4 is COMPLETE.** M2-T1 branch, M2-T2 employee and M2-T3 supplier
> management are also complete. This slice adds category and measurement-unit
> management through Settings, plus presentation domain, persistence, API and
> typed-client support. The work is uncommitted pending explicit authorization.

## Task identity

| Field        | Value                                                               |
| ------------ | ------------------------------------------------------------------- |
| Milestone    | M2 — Master Data                                                    |
| Task ID      | M2-T4                                                               |
| Task         | Category, unit and presentation master data                         |
| Status       | COMPLETED                                                           |
| Dependencies | M2-T1 through M2-T3 complete; catalog entities and ports exist      |
| Blocks       | M2-T5 product management and presentation editing in the product UI |

## Objective

Let an authenticated administrator maintain the organization-wide category and
measurement-unit catalogue that product management depends on, and expose a
typed product-presentation API that the M2-T5 product screen can edit.

## Scope

- Add category and measurement-unit update behavior to the domain.
- Add organization-scoped unique lookups and updates to both repository ports and
  both engines: unit `code`, category `name`, and presentation `name` per product.
- Add category and unit validation schemas and inferred request/response types.
- Add authenticated `GET/POST/PUT /api/v1/product-categories` and
  `/api/v1/measurement-units` routes.
- Add nested `GET/POST/PUT /api/v1/products/:productId/presentations` routes.
- Enforce the existing unique constraints with normal `409` domain conflicts.
- Add typed REST-client functions and response validation for all three resources.
- Add category and unit management to Settings, read-only for non-administrators.
- Defer the presentation editor to the M2-T5 product screen because a
  presentation always requires a product and no product UI exists yet.
- Add domain, dual-engine repository, route, REST-client and component tests.
- Update the domain, backend, database, testing, access, architecture,
  decision, progress, roadmap, state, known-issues and session documentation.

## Out of scope

- Product create/edit/list and product selection UI (M2-T5).
- Presentation editing UI until the product screen exists (M2-T5, TD-014).
- Prices, price history, estimated/measured weight snapshots or conversion
  factors (BQ-06, BQ-10).
- Hard deletion of categories, units or presentations.
- Catalog seeding; real product, category and unit values are not confirmed.

## Assumptions and open questions

- **Assumption:** category names are unique per organization and unit codes are
  unique per organization, matching the existing database constraints.
- **Assumption:** presentation names are unique per product, matching the
  existing database constraint.
- **Assumption:** catalog master data remains organization-wide (TD-009).
- Categories, units and presentations are deactivated, never hard-deleted.
- Unit conversion, price scope and price history remain open (BQ-06, BQ-10).

## Acceptance criteria

- [x] Category and unit editable fields are trimmed and validated by the domain
      on create and update.
- [x] Presentation names, integer gram weights and active state are validated on
      create and update.
- [x] Every read and write is scoped to the caller's organization; presentations
      also verify the product and product/name pair.
- [x] Both engines implement the unique lookups and updates with matching
      behavior.
- [x] Category, unit and presentation routes require authentication and the
      documented permissions.
- [x] Settings lists categories and units and lets an administrator create, edit
      and deactivate them.
- [x] Non-administrators see categories and units read-only and cannot call
      write routes.
- [x] Presentation create/list/update is available through the API and typed
      client, ready for the M2-T5 product screen.
- [x] Tests cover domain rules, both repository methods, routes, REST client and
      both Settings components.
- [x] Typecheck, lint, unit/integration tests, guard, build and formatting pass.

## Completion record

- Implementation and documentation are in the working tree; no commit was made
  without explicit authorization.
- Verified: typecheck 12/12, lint 12/12 with `BOUNDARY GUARD OK`, unit/component
  tests 261 passed + 9 skipped, SQLite integration 64 passed + 9 skipped,
  build 5/5, SQLite migrations through `0005`, seed, and formatting.
- PostgreSQL repository cases were skipped because no server is available.
- No catalog seed was added because real catalog master data is unavailable.
- No new migration was required: the existing catalog tables and unique
  constraints already cover this task.
- Category and unit management is in Settings. Presentation editing is
  deliberately deferred to M2-T5 because it belongs inside a product (TD-014).

## Next task

M2-T5 product create/edit/list for raw and processed products, including the
presentation editor for the selected product. Do not add prices or weight
snapshots until their milestones.
