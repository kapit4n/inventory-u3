# ADR 0001 — pnpm + Turborepo monorepo

## Status

Accepted.

## Context

Web, desktop, API and shared packages must evolve together without publishing
internal packages to a registry.

## Decision

Use pnpm workspaces for dependency management and Turborepo for task
orchestration and caching. Packages depend on each other through `workspace:*`.

## Consequences

- One install and one task graph for the whole product.
- Shared code is versioned and tested together.
- CI can use Turbo caching, but correctness never depends on cache hits.
