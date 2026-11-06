# ADR 0006 — Feature-oriented frontend

## Status

Accepted.

## Context

A shared component folder grows into a maze once several business areas exist.

## Decision

Organize `packages/app` by feature. A feature owns its components, queries,
mutations and feature-specific types. Routes compose features. Shared visual
primitives live in `packages/ui`.

## Consequences

- Deleting a feature removes one directory.
- Naming stays domain-specific.
- Generic utility directories are avoided.
