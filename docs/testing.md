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

The mock API dispatches by method and pathname and fails loudly for unknown
paths, so a wrong base URL does not silently reach the network.

## PostgreSQL

PostgreSQL integration tests run only when `TEST_DATABASE_URL` answers. On the
current machine no server is available, so those checks are skipped. SQLite is
the default engine and must pass on every change.
