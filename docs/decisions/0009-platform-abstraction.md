# ADR 0009 — Platform abstraction

## Status

Accepted.

## Context

Desktop-only operations must not leak Tauri imports across the shared app.

## Decision

Define platform capabilities in `packages/app/src/platform`. Web and desktop
provide implementations. Features call the shared contract through
`usePlatform`.

## Consequences

- Unsupported web behavior is explicit.
- Desktop capability growth has one boundary to change.
- The boundary guard can reject scattered Tauri imports.
