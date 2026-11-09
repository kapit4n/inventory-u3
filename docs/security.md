# Security baseline

This document describes implemented safeguards. It makes **no compliance claims**.

## Authentication

- Passwords are hashed with scrypt and a per-password salt.
- Sessions use opaque random bearer tokens.
- Only a token hash is stored in the database.
- Sessions are scoped to one organization and one active user.
- Logout revokes the server-side session.

## Authorization

- Roles and permissions are domain values.
- Protected routes declare a permission; the auth plugin fails closed.
- A request's organization scope comes from the resolved principal and the
  configured organization, never from client input.

## Business access model

The initial version has one central operator with organization-wide operational
access. Branch employees do not log in, and no branch-scoped authorization is
implemented. The roles above are foundation roles, not the final business roles.
See [ACCESS_MODEL.md](./project/ACCESS_MODEL.md) for the confirmed boundary,
current mapping and future branch-access invariants.

## Rate limiting

- Login attempts are counted in process per normalized email and client address.
- Refusals return `429 RATE_LIMITED` with `Retry-After`.
- This is a single-process control, not a distributed protection.

## Data handling

- Secrets come from the environment and are never committed.
- Structured logs redact password, password hash and session token fields.
- API error responses do not include stack traces or database error text.
- Development login routes are registered only outside production.

## Transport and browser storage

- The bearer token is held in `localStorage` for simplicity.
- A 401 clears the session and cached query data.
- CORS origins are explicit; wildcard production CORS is not configured.

## Open work

- Production deployment hardening, TLS termination and secret management
- Log shipping and monitoring
- Backup and restore drills for PostgreSQL
- Dependency and container scanning in CI
- A formal security review before handling production data
