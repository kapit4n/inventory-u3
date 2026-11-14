# Testing

## Layers

| Layer            | Tooling                 | Location                         |
| ---------------- | ----------------------- | -------------------------------- |
| Domain and utils | Vitest                  | colocated `*.test.ts`            |
| Validation       | Vitest                  | colocated `*.test.ts`            |
| API units        | Vitest                  | `apps/api/src/**/*.test.ts`      |
| API integration  | Vitest + real SQLite    | `apps/api/test/*.integration.ts` |
| React components | Vitest + RTL + jsdom    | `packages/app/src/**/*.test.tsx` |
| Browser E2E      | Playwright + mocked API | `e2e/web/*.spec.ts`              |

## Commands

```bash
pnpm run test          # unit and component tests
pnpm run test:e2e      # Playwright
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run build
```

Domain tests cover branch, employee and supplier creation and editing, catalog
and product create/update invariants (including identity rules, raw/processed
kind, reference shape and average weight), effective-dated price rules (including
basis mapping, integer amounts, currency and valid dates), stock-movement
corrections and shared time rules. API integration tests exercise the branch,
employee, supplier, catalog, product and price repositories on a real SQLite
database; the same files run against PostgreSQL when a server is configured.
Branch, employee, supplier, category, measurement-unit, product,
product-presentation and product-price route tests build the real Fastify server
and cover listing, permissions, create, duplicate business keys, rename/
deactivate, branch membership, catalog/product ownership, unknown references,
not-found, duplicate price dates and validation. The branch, employee, supplier,
category, unit, product, presentation and price management component tests cover
the administrator create/edit flows and the read-only view for other roles. The
API-client tests cover the branch, employee, supplier, category, unit, product,
presentation and price collection envelopes, create/update contracts and response
validation.

For SQLite integration tests on this machine, override the `.env` PostgreSQL test
URL:

```bash
TEST_DATABASE_URL= pnpm --filter @inventory-u3/api test:integration
```

The E2E suite needs a built web app and installed Chromium:

```bash
pnpm --filter @inventory-u3/web build
pnpm --filter @inventory-u3/e2e exec playwright install chromium
pnpm run test:e2e
```

## Browser coverage

The current specs cover:

- application shell mount and navigation
- sidebar collapse persistence
- login, failed login, throttled login, development login and logout
- organization settings prefill, save and permission failure
- Spanish dashboard/inventory/settings and the language switch
- branch, employee, supplier, category and unit list/create/edit on `/settings`,
  including the duplicate-name problem and the read-only STAFF view
- product list/create/edit and tray-presentation create on `/products`
- price-history display and effective-dated price creation on `/products`,
  including the read-only STAFF view

The mock API dispatches by method and pathname and fails loudly for unknown
paths, so a wrong base URL does not silently reach the network.

## PostgreSQL

PostgreSQL integration tests run only when `TEST_DATABASE_URL` answers. On the
current machine no server is available, so those checks are skipped. SQLite is
the default engine and must pass on every change. The boundary guard separately
checks that both schema trees declare the same tables and both migration journals
have the same entry count.

## Current gaps

- No stock, purchase, production, sales-checkpoint or closing tests exist because
  those features do not exist.
- No branch-scoped authorization tests exist until branch users are implemented.
- E2E now covers master data, products, presentations and prices; the reusable
  branch selector has no dedicated component test, and no inventory workflow
  screen exists.
- There is no CI workflow; the commands above are run locally.
