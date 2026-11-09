# Domain

> This file documents the domain **currently implemented in `packages/domain`**.
> The proposed business domain (branches, products, units, stock, production,
> sales checkpoints) is documented in
> [BUSINESS_DOMAIN_MODEL.md](./project/BUSINESS_DOMAIN_MODEL.md). Do not read a
> proposed entity from that document as implemented code.

`packages/domain` is framework-independent TypeScript. It currently contains the
organization, identity and session foundation. Inventory entities arrive in
later milestones.

## Organization

`Organization` is the tenant boundary:

```ts
interface Organization {
  id: OrganizationId;
  name: string;
  timezone: string;
  currency: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
```

`updateOrganizationSettings` trims and validates the name, requires a non-empty
timezone and requires an uppercase three-letter currency code.

## Users and roles

- `User` belongs to exactly one organization.
- Roles are `ADMINISTRATOR`, `MANAGER` and `STAFF`.
- Permissions are `organization:read`, `organization:manage`, `users:read`,
  `users:manage`, `inventory:read`, `inventory:write` and `reports:read`.
- `hasPermission(role, permission)` is the single role matrix.

## Sessions

- A session is issued to an active user in the configured organization.
- The bearer token is opaque; only its hash is stored.
- `expiresAt` decides validity on read.
- Logout revokes the session.

## Error model

`DomainError` carries one of:

- `INVALID_INPUT`
- `NOT_FOUND`
- `DUPLICATED_RECORD`
- `UNAUTHENTICATED`
- `FORBIDDEN`

The HTTP layer maps these to status codes and wire error codes.

## Ports

Repositories are declared in `packages/domain/src/ports`:

- `OrganizationRepository`
- `UserRepository`
- `SessionRepository`
- `UnitOfWork`

Each engine implements the same ports. Adding a method requires both
implementations (ADR 0025).

## Not yet modeled

- Inventory items, categories, units and suppliers
- Stock levels, movements, adjustments and transfers
- Purchasing and receiving
- Reports and exports

These are product decisions for later milestones, not placeholders to guess at.
