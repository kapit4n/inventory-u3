# Current Task

> Last updated: 2026-11-12.
>
> **M2-T5 is COMPLETE.** M2-T1 branch, M2-T2 employee, M2-T3 supplier and M2-T4
> catalog master data are also complete. This slice adds product list/create/edit
> for raw and processed products, plus the presentation editor inside the product
> screen. The work is uncommitted pending explicit authorization; M2-T4 is
> committed as `992d6ea`.

## Task identity

| Field        | Value                                                           |
| ------------ | --------------------------------------------------------------- |
| Milestone    | M2 — Master Data                                                |
| Task ID      | M2-T5                                                           |
| Task         | Product create/edit/list and product-screen presentation editor |
| Status       | COMPLETED                                                       |
| Dependencies | M2-T4 complete; catalog entities, persistence and API exist     |
| Blocks       | M2-T6 average-weight and selling-price configuration/history    |

## Objective

Let an authenticated administrator list, create and edit raw and processed
products against the organization's categories and measurement units, and manage
the presentations of a selected processed product from the product screen.

## Scope

- Add product update behavior to the domain and `ProductRepository.update` on the
  port, SQLite repository and PostgreSQL repository.
- Validate that the selected category and inventory, sales, purchase and
  production units exist in the caller's organization.
- Add product validation schemas and inferred request/response types.
- Add authenticated `GET/POST/PUT /api/v1/products` routes.
- Add typed REST-client product functions with response validation.
- Add a dedicated `/products` screen with list/create/edit/deactivate,
  read-only behavior for non-administrators and English/Spanish copy.
- Expose the M2-T4 presentation editor from the product screen for processed
  products, including create/edit/deactivate.
- Add domain, dual-engine repository, route, REST-client and component tests.
- Update the domain, backend, database, testing, access, architecture, decision,
  progress, roadmap, state, known-issues and session documentation.

## Out of scope

- Selling prices, price history, estimated/measured weight snapshots or unit
  conversion factors (BQ-06, BQ-10, M2-T6).
- Raw-to-finished production relationship rules (M5).
- Hard deletion of products or presentations.
- Catalog or product seeding; real master data is not confirmed.
- Branch ownership for products; the catalog remains organization-wide (TD-009).
- A backend restriction that presentations belong only to processed products.
  The UI exposes the editor for processed products, but the existing API remains
  product-scoped for every kind.

## Assumptions and open questions

- **Assumption:** product names are not unique; identity is the product id.
- **Assumption:** a product may change its `RAW`/`PROCESSED` kind when edited.
- **Assumption:** category and unit references are validated at the API
  boundary; inactive references remain visible when editing an existing product.
- **Assumption:** the product screen belongs in primary navigation rather than
  Settings because it is an operational catalog workflow.
- Categories, units and presentations stay deactivated rather than deleted.
- Unit conversion, price scope and price history remain open (BQ-06, BQ-10).

## Acceptance criteria

- [x] Product create and update trim and validate the name and require a known
      raw/processed kind.
- [x] Product create and update require a category, inventory unit and sales
      unit, with optional purchase and production units.
- [x] Category and unit references must belong to the caller's organization.
- [x] Every product read and write is scoped to the caller's organization.
- [x] Both engines implement product list/create/update with matching behavior.
- [x] Product routes require authentication and the documented permissions.
- [x] The products screen lists products and lets an administrator create, edit
      and deactivate them; other roles see it read-only.
- [x] A processed product can open its presentation list and create, edit or
      deactivate presentations with an average weight per tray.
- [x] Tests cover domain rules, both repository methods, routes, REST client and
      both product UI flows.
- [x] Typecheck, lint, unit/integration tests, guard, build, migrations, seed and
      formatting pass.

## Completion record

- Implementation and documentation are in the working tree; no M2-T5 commit was
  made without explicit authorization.
- M2-T4 is committed as `992d6ea feat: add catalog master data management`; the
  previously committed M2-T4 documentation saying "uncommitted" was corrected.
- Verified: typecheck 12/12, lint 12/12 with `BOUNDARY GUARD OK`, unit/component
  tests 274 passed + 9 skipped, SQLite integration 67 passed + 9 skipped,
  build 5/5, SQLite migrations through `0005`, seed and formatting.
- PostgreSQL repository cases were skipped because no server is available.
- No product, category, unit or presentation seed was added because real master
  data is unavailable.
- No new migration was required: the existing `products` table already carries
  the category, kind, unit and active-state columns and ownership constraints.
- Product names are not unique. Presentations remain available through the API
  for any product, but the UI shows the presentation action only for processed
  products (TD-015).

## Next task

M2-T6 average-weight and selling-price configuration with history. Do not add
prices or weight snapshots before its milestone; do not start M3 purchasing until
M2 is complete.
