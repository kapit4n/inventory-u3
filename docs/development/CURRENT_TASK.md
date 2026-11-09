# Current Task

> Last updated: 2026-11-09.
>
> **No feature task is currently in progress.** M1-T2 (catalog identity) is
> complete. The next task is M1-T3.

## Task identity

| Field        | Value                                                                |
| ------------ | -------------------------------------------------------------------- |
| Milestone    | M1 — Business Domain Foundation                                      |
| Task ID      | M1-T3                                                                |
| Task         | Raw/processed distinction and average-weight configuration           |
| Status       | NOT_STARTED (ready)                                                  |
| Dependencies | M1-T2 complete; TD-001, TD-009 and BQ-06 working assumption accepted |
| Blocks       | M1-T4, M2, M3, M4, M5, M6, M7, M8                                    |

## Objective

Make the raw/processed distinction explicit in the product model and add the
configured average weight per tray to the presentation model. Keep the work
framework-independent and dual-engine. Do not add prices, conversion arithmetic
or stock.

## Context

- M1-T2 implemented units, categories, products and presentations on both
  engines. Products have no kind yet; presentations have no weight yet.
- BR-015–BR-020 distinguish processed products (trays, average weight) from
  unprocessed products (configured unit, no tray conversion). BR-021 covers the
  unprocessed case.
- BQ-06 (organization-wide vs branch-specific price/weight configuration) is not
  answered. TD-009 records the working assumption: catalog configuration is
  organization-wide until product input says otherwise. Stop and ask if that
  assumption blocks the task.
- BQ-10 (unit conversion) remains open; do not add conversion factors.
- The catalog tables are newly created and contain no seeded product data. Any
  migration that adds a required column must still be explicit about existing
  rows rather than hiding a business default.

Read before starting:

1. [BUSINESS_REQUIREMENTS.md](../project/BUSINESS_REQUIREMENTS.md) — BR-014 to BR-021.
2. [BUSINESS_DOMAIN_MODEL.md](../project/BUSINESS_DOMAIN_MODEL.md) — sections 3 and 4.
3. [PRODUCT_MEASUREMENT_RULES.md](../workflows/PRODUCT_MEASUREMENT_RULES.md).
4. [open-questions.md](../open-questions.md) — BQ-06 and BQ-10.
5. The implemented catalog slice in `packages/domain/src/product`, both schema
   trees, both migrations and the catalog repositories.

## Files and modules involved

- `packages/domain/src/product/product.ts` and `product-presentation.ts`.
- `packages/domain/src/product/product-catalog.test.ts`.
- `packages/domain/src/ports/index.ts` only if a port signature changes.
- `packages/types/src/identifiers.ts` only if a new branded id is required.
- `database/schema/catalog.ts` and `database/schema/sqlite/catalog.ts`.
- `database/migrations/` and `database/migrations-sqlite/` — generated together.
- PostgreSQL and SQLite catalog repositories and their integration test.
- Documentation after implementation.

## Proposed model

Keep the additions explicit and small:

- `ProductKind` — domain union `"RAW" | "PROCESSED"` (or an equivalent
  domain-specific representation). The product carries a required kind. Do not
  use a numeric flag whose meaning is only known outside the domain.
- `ProductPresentation.averageWeightGrams` — a positive integer or `undefined`.
  The documented 0.001 kg precision is exactly one gram, so integer grams avoid
  floating-point drift. Display conversion to kilograms belongs to the UI.
- Because presentations belong to products, decide and document whether every
  presentation requires a weight or only processed-product presentations do.
  If the rule needs the product kind, enforce it where the product is available
  rather than duplicating the kind on the presentation.
- Do not add an estimated/measured weight, a price, a tray-to-unit conversion or
  a historical snapshot in this task.

## Acceptance criteria

- [ ] `ProductKind` is required on new products and persisted in both engines.
- [ ] Raw and processed products are distinguishable without external lookup
      tables or free-text notes.
- [ ] `ProductPresentation` can store a configured average weight per tray; no
      value is hardcoded.
- [ ] Weight uses an exact integer representation; no floating kilograms and no
      silent rounding.
- [ ] The migration states how existing rows are handled; no business-meaning
      default is hidden.
- [ ] Domain tests cover valid/invalid kinds and weight values.
- [ ] Repository tests cover the new fields on both engines where available,
      including organization isolation.
- [ ] Both schema trees and both migration journals change together.
- [ ] `pnpm run guard:boundaries`, `typecheck`, `lint` and `test` pass.
- [ ] SQLite migration and seed run successfully.
- [ ] Documentation distinguishes implemented configuration from still-proposed
      measurement behaviour.

## Tests required

- Domain tests for required kind, positive integer weight and revised
  presentation invariants.
- Repository round-trip tests for kind and average weight.
- Cross-organization isolation remains covered.
- SQLite migration smoke check.
- PostgreSQL tests run when `TEST_DATABASE_URL` answers; otherwise skip and
  record the skip.

## Remaining steps

1. Re-read the requirements, product rules, TD-009 and the M1-T2 slice.
2. Decide and document the weight optionality rule before coding.
3. Implement the domain changes and tests.
4. Update both schemas, generate both migrations, and implement the repository
   changes for both engines.
5. Run the verification commands and the SQLite migration.
6. Update `IMPLEMENTATION_PROGRESS.md`, the roadmap, this file, `SESSION_LOG.md`,
   `KNOWN_ISSUES.md` and the domain/model/measurement documents.
7. Choose M1-T4 (stock movement and balance concepts) or the next roadmap task.

## Out of scope for this task

- Product CRUD UI or API routes.
- Prices or price history.
- Estimated/measured weight records, sales snapshots and production snapshots.
- Stock movements, purchases, production, sales checkpoints or closing.
- Unit conversion arithmetic.
- Seeding product data with invented business values.
