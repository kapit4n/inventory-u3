# ADR 0004 — Framework-independent domain

## Status

Accepted.

## Context

Inventory rules must be testable without React, HTTP, Tauri or a database, and
must not drift between web and desktop.

## Decision

Keep entities, invariants, permissions and repository ports in
`packages/domain`, written in pure TypeScript. Infrastructure implements the
ports.

## Consequences

- Domain tests are fast and framework-free.
- A feature can be reasoned about from the domain outward.
- React, Drizzle and database drivers are forbidden in the domain.
