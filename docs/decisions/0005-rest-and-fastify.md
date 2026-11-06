# ADR 0005 — REST over HTTP with Fastify

## Status

Accepted.

## Context

The browser and desktop clients need one stable transport, and the API owns all
database access.

## Decision

Expose versioned JSON REST endpoints from Fastify 5. Validate with Zod, map domain
failures through one problem envelope, and log structured redacted events.

## Consequences

- The transport is explicit and easy to inspect.
- No GraphQL schema layer or RPC framework is introduced.
- Client and server share validation primitives where useful.
