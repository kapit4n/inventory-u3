# ADR 0038 — Inventory U3 starts from a generic organization/session foundation

## Status

Accepted.

## Context

Inventory U3 was created from a mature dental application foundation. The
monorepo, tooling, two-engine persistence strategy, authentication, shared React
application and test harness are reusable. The dental business domain is not.

Keeping dental modules behind unregistered routes or unused exports would violate
the product boundary and make the next milestone guess which code is live.

## Decision

- Remove dental business code from domain, validation, database, API, app, i18n
  and E2E layers.
- Keep the organization, user, session, role and permission foundation.
- Keep SQLite as the default engine and PostgreSQL as the explicit second engine.
- Keep only the three foundation tables: `organizations`, `users`, `sessions`.
- Expose only health, auth, dev-auth and organization settings routes.
- Keep the dashboard, inventory placeholder and organization settings screens.
- Do not introduce inventory entities, stock rules or reports until their
  milestone.
- Remove dental-specific ADRs and document that the numbering gaps are
  intentional.

## Consequences

- The first inventory feature starts from a small, honest codebase.
- The reusable infrastructure and guardrails remain intact.
- Product questions about the stock model stay open instead of being encoded in
  placeholder tables.
- Some ADR numbers are missing; the decision log reflects the product history
  rather than pretending the removed decisions never existed.
