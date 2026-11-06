# ADR 0008 — One React application package with thin shells

## Status

Accepted.

## Context

Web and desktop must not become two applications that drift.

## Decision

Put routes, providers, features, styles and shell wiring in `packages/app`.
`apps/web` and `apps/desktop` only mount that package and declare their target.

## Consequences

- A feature is implemented once.
- The application frame renders once, in the root route.
- Shells contain deployment concerns, not product behavior.
