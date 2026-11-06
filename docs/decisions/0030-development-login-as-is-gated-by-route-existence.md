# ADR 0030 — Development login-as is gated by route existence

## Status

Accepted.

## Context

Switching roles while testing should not require retyping passwords, but a
production build must not expose a passwordless login path.

## Decision

Register `GET /api/v1/auth/dev-users` and `POST /api/v1/auth/dev-login` only when
the process is not production. The client discovers the feature by asking the
route; it does not trust a build flag.

## Consequences

- Development is convenient.
- Production returns 404 because the routes do not exist.
- The login screen simply omits the chooser when the query fails.
