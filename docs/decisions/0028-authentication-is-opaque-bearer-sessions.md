# ADR 0028 — Authentication is opaque bearer sessions, hashed at rest

## Status

Accepted.

## Context

The foundation needs real authentication without introducing an identity provider
or a second authorization model.

## Decision

- Passwords are hashed with scrypt.
- Login issues an opaque random bearer token.
- Only a hash of the token is stored in `sessions`.
- The auth plugin resolves the principal and organization scope.
- Protected routes declare a domain permission.
- A 401 clears the client session and cached query data.

## Consequences

- No JWT parsing or client-side role decisions are trusted.
- Session revocation is a database operation.
- Multi-organization membership remains a future change.
