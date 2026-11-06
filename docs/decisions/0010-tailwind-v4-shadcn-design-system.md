# ADR 0010 — Tailwind v4 + shadcn/ui + token layer

## Status

Accepted.

## Context

The product needs a consistent, accessible visual language without building every
primitive from scratch.

## Decision

Use Tailwind CSS v4 with semantic custom properties and shadcn/ui-derived
primitives in `packages/ui`. Status colors map through a small tone vocabulary,
not ad-hoc classes in features.

## Consequences

- Features reuse primitives and tokens.
- Theming is centralized.
- `packages/ui` contains no inventory business rules.
