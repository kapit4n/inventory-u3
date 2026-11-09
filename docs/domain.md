# Domain

> This file documents the domain **currently implemented in `packages/domain`**.
> The proposed remainder of the business domain (prices, estimated/measured
> weights, stock, production, sales checkpoints) is documented in
> [BUSINESS_DOMAIN_MODEL.md](./project/BUSINESS_DOMAIN_MODEL.md). Do not read a
> proposed entity from that document as implemented code.

`packages/domain` is framework-independent TypeScript. It contains the
organization, identity, session, branch and product-catalog foundation,
including the raw/processed kind and average-weight configuration. It also
contains the stock movement vocabulary and balance shape; stock persistence and
transactional entities arrive in later milestones.

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
`isActive` to `true`. `updateBranch` applies the same name rule and can change
`isActive`; it advances `updatedAt` and leaves identity and ownership unchanged.
A branch belongs to exactly one organization; operational records will belong to
one branch. Branches are deactivated rather than deleted so future operational
history keeps its reference. Names are unique within an organization.

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
- A product has a required `RAW` or `PROCESSED` kind. Raw products use their
  configured unit directly; processed products are prepared as trays.
- `ProductPresentation` belongs to one product and one organization and carries
  the configured `averageWeightGrams` per tray. The weight is a positive integer
  because the documented 0.001 kg precision is exactly one gram.
- Prices, estimated/measured weights and historical snapshots are not modelled
  yet. Those are M2/M5/M6 work.

## Stock concepts

The vocabulary exists without a stock table or repository port:

- `StockMovementReason` is `RECEIVING`, `PRODUCTION_INPUT`,
  `PRODUCTION_OUTPUT`, `SALES_CHECKPOINT`, `ADJUSTMENT`, `WASTE` or
  `CORRECTION`.
- `StockMovement` belongs to one organization, one branch and one product. Its
  signed `quantityDelta` is non-zero and expressed in the product's inventory
  unit.
- A movement carries an optional source reference, business time (`occurredAt`),
  recording time (`recordedAt`), actor and note.
- A correction is another movement with reason `CORRECTION` and a
  `correctsMovementId` pointing at a different movement. It never edits or
  deletes the original (ADR 0040).
- Created movements and nested source references are frozen at runtime.
- `StockBalance` is an exported read-model interface only. Whether it is derived
  or cached remains open (BQ-07); no factory, port or table exists.
- Negative-stock enforcement, opening balances, approval and reversal arithmetic
  are intentionally absent (BQ-08 and BQ-03 remain open).

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
- The roles are organization-wide. The initial central-operator boundary and the
  future branch-scope requirement are in
  [ACCESS_MODEL.md](./project/ACCESS_MODEL.md).

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
- `BranchRepository` — find by id or name, list, create and update, always scoped
  by organization
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

- Prices, estimated/measured weights and historical snapshots
- Persisted stock movements, balance strategy, reconciliation and adjustments
- Suppliers, employees and purchases
- Production batches
- Sales checkpoints and daily closing
- Reports and exports

These are product decisions for later milestones, not placeholders to guess at.
