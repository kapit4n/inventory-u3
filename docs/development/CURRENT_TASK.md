# Current Task

> Last updated: 2026-11-13.
>
> **M2-T7 is COMPLETE and committed as `cc70bfc`; M2 is COMPLETE.** M2-T1
> through M2-T6 are also complete. The only deferred M2 scope item,
> raw-to-finished product relationships, moved to M5 by BQ-11.

## Task identity

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| Milestone    | M2 — Master Data                                             |
| Task ID      | M2-T7                                                        |
| Task         | Remaining API routes, validation, problem mapping, UI, tests |
| Status       | COMPLETED (committed as `cc70bfc`)                           |
| Dependencies | M2-T1 through M2-T6 complete                                 |
| Blocks       | M3 supplier purchases and receiving                          |

## Objective

Close M2 by proving the master-data and product screens work in a real browser,
not only in jsdom component tests.

## Scope

- Add Playwright coverage for `/settings`: branch, employee, supplier, product
  category and measurement unit list/create/edit flows.
- Add Playwright coverage for `/products`: product create/edit, tray
  presentation create, price-history display and effective-dated price create.
- Cover the duplicate-branch problem mapping and the read-only view for
  non-administrators.
- Keep the existing settings and i18n specs working now that `/settings` mounts
  all six master-data queries.

## Out of scope

- New API routes or validation schemas: the M2 routes already exist and are
  covered by route and REST-client tests.
- Raw-to-finished product relationship rules: BQ-11 resolves production inputs
  as free-form per batch with no recipe/BOM entity; this belongs to M5.
- Purchase, stock, production, sales, closing or reporting work (M3 onward).
- Replacing the illustrative sample catalogue with real master data (BQ-19).

## Acceptance criteria

- [x] A browser spec drives branch create/edit and the duplicate-name message.
- [x] A browser spec creates an employee assigned to a branch.
- [x] A browser spec creates a supplier, a category and a unit.
- [x] A browser spec lists master data read-only for a STAFF session.
- [x] A browser spec lists products and opens current/scheduled price history.
- [x] A browser spec creates a raw product and edits a processed product.
- [x] A browser spec creates a tray presentation.
- [x] A browser spec appends an effective-dated selling price and asserts the
      minor-unit payload.
- [x] A browser spec keeps products and prices visible but hides writes for a
      STAFF session.
- [x] `pnpm --filter @inventory-u3/e2e run typecheck`, lint and
      `pnpm run test:e2e` pass.

## Completion record

- Added `e2e/web/master-data.spec.ts`, `e2e/web/products.spec.ts` and the
  `e2e/web/fixtures/session.ts` role helper.
- Updated `e2e/web/settings.spec.ts` and `e2e/web/i18n.spec.ts` to mock the
  master-data list queries now mounted on `/settings`.
- Browser verification: 29 Chromium tests passed (6 new master-data, 5 new
  product, plus the existing 18 specs).
- No production code changed; the API routes, validation, problem mapping and UI
  already existed from M2-T1 through M2-T6.
- The working-tree changes are committed as `cc70bfc`.

## Next task

Start M3 supplier purchases and receiving, beginning with the purchase and
purchase-item domain entities and states. Do not start M4 stock work first.
