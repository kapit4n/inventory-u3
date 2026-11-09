# Current Task

> Last updated: 2026-11-09.
>
> **No feature task is currently in progress.** M1-T1 (branch foundation) is
> complete. The next task is M1-T2.

## Task identity

| Field        | Value                                                             |
| ------------ | ----------------------------------------------------------------- |
| Milestone    | M1 — Business Domain Foundation                                   |
| Task ID      | M1-T2                                                             |
| Task         | Product, category, measurement unit and presentation domain model |
| Status       | NOT_STARTED (ready)                                               |
| Dependencies | M1-T1 complete; TD-001 and TD-003 accepted                        |
| Blocks       | M1-T3, M1-T4, M2, M3, M4, M5, M6, M7, M8                          |

## Objective

Define the master-data concepts every operational record will reference:
categories, measurement units, products and product presentations. Keep the
model independent of React, Drizzle, the database engines and the API.

This task establishes the vocabulary. It must not build product CRUD screens or
sales/purchase workflows.

## Context

- Branch is now implemented on both engines.
- A processed product uses trays and an average weight per tray (BR-015–BR-020).
- Unprocessed products use their configured unit without tray conversion
  (BR-021).
- A product may be sold in a different unit than it is purchased in; conversion
  support is still open (BQ-10).
- Raw vs processed distinction and average-weight configuration are M1-T3, but
  the T2 model must not make them impossible to add.

Read before starting:

1. [BUSINESS_REQUIREMENTS.md](../project/BUSINESS_REQUIREMENTS.md) — BR-014 to BR-021.
2. [BUSINESS_DOMAIN_MODEL.md](../project/BUSINESS_DOMAIN_MODEL.md) — sections 3 and 4.
3. [PRODUCT_MEASUREMENT_RULES.md](../workflows/PRODUCT_MEASUREMENT_RULES.md).
4. [open-questions.md](../open-questions.md) — BQ-06, BQ-10, BQ-11.
5. The implemented branch slice in `packages/domain/src/branch`, both schema
   trees and both repository builders.

## Files and modules involved

- `packages/domain/src/product/` (new) and `packages/domain/src/index.ts`.
- `packages/domain/src/ports/index.ts` — new repositories if persistence lands.
- `packages/types/src/identifiers.ts` — new branded ids if required.
- `database/schema/` and `database/schema/sqlite/` — only if persistence lands.
- `database/migrations/` and `database/migrations-sqlite/` — generated together.
- `apps/api/src/infrastructure/persistence/` — repositories and wiring if
  persistence lands.
- Tests colocated with the domain and in `apps/api/test/`.
- Documentation after implementation.

## Proposed domain concepts

Keep the first version explicit and small:

- `MeasurementUnit` — a code/name such as `KILOGRAM`, `UNIT`, `TRAY`, with the
  information needed to display and compare it. Do not invent conversion factors
  (BQ-10).
- `ProductCategory` — organization-owned grouping with a name.
- `Product` — organization-owned item with a name, category, sale unit and an
  inventory/purchase unit. Do not add prices yet; price history is M2.
- `ProductPresentation` — a product packaging/presentation (for example a
  covered tray). Average weight per tray belongs to T3 unless the design makes
  it inseparable; document the choice.

Avoid inventing SKU formats, tax fields, supplier links, barcodes or recipes.

## Acceptance criteria

- [ ] New concepts are pure TypeScript and import only `@inventory-u3/types` and
      domain shared modules.
- [ ] Names are domain-specific; no generic `manager`, `service` or `helper`.
- [ ] A product belongs to exactly one organization and one category.
- [ ] Units are explicit values, not free-text guesses at every call site.
- [ ] Raw vs processed and average-weight rules remain implementable by M1-T3.
- [ ] If persistence is added, both schema trees and both migration journals
      change together, with repository implementations for both engines.
- [ ] Organization scoping is explicit in every repository method.
- [ ] `pnpm run guard:boundaries`, `typecheck`, `lint` and `test` pass.
- [ ] Documentation states what is implemented versus proposed.

## Tests required

- Domain tests for valid and invalid names/units.
- Domain tests for organization/category ownership and any invariants introduced.
- Repository tests for each new port method if persistence lands, on both
  engines where available.
- A cross-organization isolation test for each new repository.
- SQLite migration smoke check if tables are added.
- PostgreSQL tests run when `TEST_DATABASE_URL` answers; otherwise skip and
  record the skip.

## Remaining steps

1. Re-read the requirements and the branch slice.
2. Decide the exact T2 boundary versus T3 and write it in this file before coding.
3. Implement the domain concepts and tests.
4. Add persistence in both engines if the acceptance criteria require it.
5. Wire repositories through `Repositories`.
6. Run the verification commands and the SQLite migration.
7. Update `IMPLEMENTATION_PROGRESS.md`, the roadmap, this file, `SESSION_LOG.md`
   and the domain/model documentation.
8. Choose M1-T3 or the next roadmap task.

## Out of scope for this task

- Product CRUD UI or API routes.
- Prices, price history, purchases or suppliers.
- Stock movements, production, sales checkpoints or closing.
- Unit conversion arithmetic.
- Seeding product data with invented business values.
