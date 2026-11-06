# ADR 0025 — Two engines: SQLite runs the product, PostgreSQL is kept

## Status

Accepted.

## Context

The product must run locally without infrastructure, while retaining a path to
server deployment and PostgreSQL operations.

## Decision

SQLite is the default engine for development and the current product workflow.
PostgreSQL is the explicit second engine.

- Both engines implement the same repository ports.
- Both have Drizzle schema trees and migration journals.
- A schema change lands in both.
- A repository method is written twice.
- No third engine and no abstraction layer over the two.

## Consequences

- Local setup works without Docker.
- Repository work is deliberately duplicated rather than hidden behind a leaky
  abstraction.
- PostgreSQL integration tests require a reachable database and are skipped when
  none is available.
