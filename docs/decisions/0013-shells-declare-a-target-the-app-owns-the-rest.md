# ADR 0013 — Shells declare a target; the app owns the rest

## Status

Accepted.

## Context

History mode, API URL selection and runtime capabilities differ between web and
desktop, but routing and providers should not.

## Decision

Each shell passes a runtime target to `mountApp`. The shared app selects the
appropriate history and capabilities. Desktop uses memory history; web uses
browser history.

## Consequences

- One router factory serves both targets.
- Shell-specific behavior is visible in one place.
- Features remain target-agnostic.
