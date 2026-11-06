# ADR 0029 — Login attempts are limited in process

## Status

Accepted.

## Context

The API must resist basic credential-guessing without introducing a shared cache
in the foundation.

## Decision

Count failed login attempts in process per normalized email and client address.
Refuse with `429 RATE_LIMITED` and a `Retry-After` header.

## Consequences

- Simple and dependency-free for a single process.
- The limit resets on restart and is not shared between instances.
- A distributed deployment needs a shared store in a later milestone.
