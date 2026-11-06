# ADR 0007 — Server state and local state are separate

## Status

Accepted.

## Context

Inventory data belongs to the server; filters, theme and open dialogs belong to
the current screen.

## Decision

Use TanStack Query for server state and cache invalidation. Use component state
or small Zustand stores for local UI state. No global API-data store.

## Consequences

- Server data has one fetch/cache owner.
- Local preferences stay small and explicit.
- Optimistic writes require a deliberate decision per feature.
