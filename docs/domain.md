# Domain

> This file documents the domain **currently implemented in `packages/domain`**.
> The proposed remainder of the business domain (measurement configuration,
> prices, stock, production, sales checkpoints) is documented in
> [BUSINESS_DOMAIN_MODEL.md](./project/BUSINESS_DOMAIN_MODEL.md). Do not read a
> proposed entity from that document as implemented code.

`packages/domain` is framework-independent TypeScript. It contains the
organization, identity, session, branch and product-catalog foundation. Stock
and transactional entities arrive in later milestones.

## Branch

`Branch` is the inventory boundary inside an organization:

```ts
interface Branch {
  id: BranchId;
  organizationId: OrganizationId;
  name: string;
  isActive: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
```

`createBranch` trims and validates the name (1–120 characters) and defaults
`isActive` to `true`. A branch belongs to exactly one organization; operational
records will belong to one branch.

## Product catalog

The catalog is organization-wide master data, not branch data. A branch owns its
stock; it does not own a private copy of the catalog.

- `MeasurementUnit` has a code, a display name and an active flag. Units are
  organization-owned rows, not a closed enum, so BR-014's "other configurable
  units" can be added. No conversion factor is stored (BQ-10 is open).
- `ProductCategory` groups products with a name and an active flag.
- `Product` belongs to one organization and one category. It references an
  inventory unit and a sales unit; purchase and production units are optional
  because not every product is bought or prepared.
- `ProductPresentation` belongs to one product and one organization. It records
  the packaging/presentation identity. Average weight per tray is deliberately
  not present yet; M1-T3 adds it.
- Prices, the raw/processed distinction and average weight are not modelled yet.
  Those are M1-T3/M2 work, not hidden properties of these entities.

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
- `BranchRepository`
- `MeasurementUnitRepository`
- `ProductCategoryRepository`
- `ProductRepository`
- `ProductPresentationRepository`
- `UserRepository`
- `SessionRepository`
- `UnitOfWork`

Each engine implements the same ports. Adding a method requires both
implementations (ADR 0025).

## Not yet modeled

- Raw vs processed product distinction, average weight per tray and prices
- Suppliers, employees and purchases
- Stock levels, movements, adjustments and transfers
- Production batches
- Sales checkpoints and daily closing
- Reports and exports

These are product decisions for later milestones, not placeholders to guess at.
