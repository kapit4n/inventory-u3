# Domain

> This file documents the domain **currently implemented in `packages/domain`**.
> The proposed remainder of the business domain (prices, estimated/measured
> weights, stock, production, sales checkpoints) is documented in
> [BUSINESS_DOMAIN_MODEL.md](./project/BUSINESS_DOMAIN_MODEL.md). Do not read a
> proposed entity from that document as implemented code.

`packages/domain` is framework-independent TypeScript. It contains the
organization, identity, session, branch, employee, supplier and product-catalog
foundation, including the raw/processed kind and average-weight configuration. It
also contains the stock movement vocabulary and balance shape; stock persistence
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
`isActive` to `true`. `updateBranch` applies the same name rule and can change
`isActive`; it advances `updatedAt` and leaves identity and ownership unchanged.
A branch belongs to exactly one organization; operational records will belong to
one branch. Branches are deactivated rather than deleted so future operational
history keeps its reference. Names are unique within an organization.

## Employee

`Employee` identifies the person who prepared production, without creating an
application login:

```ts
interface Employee {
  id: EmployeeId;
  organizationId: OrganizationId;
  branchId: BranchId;
  fullName: string;
  isActive: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
```

`createEmployee` trims and validates the full name (1–160 characters) and
defaults `isActive` to `true`. `updateEmployee` applies the same name rule and
can change the branch or active state while preserving identity, ownership and
`createdAt`. Names are not unique: two real people may share a name. Employees
are deactivated rather than deleted so later production rows keep their preparer
reference. Each employee belongs to one branch today; whether employees can be
shared across branches remains open (BQ-20).

## Supplier

`Supplier` identifies a provider from whom purchases are made:

```ts
interface Supplier {
  id: SupplierId;
  organizationId: OrganizationId;
  name: string;
  isActive: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
```

`createSupplier` trims and validates the name (1–160 characters) and defaults
`isActive` to `true`. `updateSupplier` applies the same name rule and can change
the active state while preserving identity, ownership and `createdAt`.
Suppliers are organization-wide, have no branch, and names are not unique.
They are deactivated rather than deleted so later purchases keep their supplier
reference. Contact, address, tax and payment details are not modeled yet (BQ-21,
TD-013).

## Product catalog

The catalog is organization-wide master data, not branch data. A branch owns its
stock; it does not own a private copy of the catalog.

- `MeasurementUnit` has a code, a display name and an active flag. Units are
  organization-owned rows, not a closed enum, so BR-014's "other configurable
  units" can be added. No conversion factor is stored (BQ-10 is open). Codes are
  unique per organization. `createMeasurementUnit` and
  `updateMeasurementUnit` trim and validate the code (1–32 characters) and name
  (1–80 characters); update can also change the active flag.
- `ProductCategory` groups products with a name and an active flag. Names are
  unique per organization. `createProductCategory` and `updateProductCategory`
  trim and validate the name (1–120 characters); update can also change the
  active flag.
- `Product` belongs to one organization and one category. It references an
  inventory unit and a sales unit; purchase and production units are optional
  because not every product is bought or prepared. `createProduct` and
  `updateProduct` trim and validate the name, require a known kind, and default
  `isActive` to `true`; update can change the category, units, kind and active
  flag while preserving identity and ownership. Names are not unique. References
  are validated against the organization at the API boundary.
- A product has a required `RAW` or `PROCESSED` kind. Raw products use their
  configured unit directly; processed products are prepared as trays.
- `ProductPresentation` belongs to one product and one organization and carries
  the configured `averageWeightGrams` per tray. The weight is a positive integer
  because the documented 0.001 kg precision is exactly one gram. Names are unique
  within a product, `productId` is immutable, and update can change the name,
  weight or active flag.
- `ProductPriceHistory` is an append-only row belonging to one organization and
  product. It carries an integer `amountMinor`, the currency captured from the
  organization, a `PER_KILOGRAM` or `PER_SALES_UNIT` basis captured from the
  product kind, an ISO `effectiveFrom` date and a creation time. Effective dates
  are unique per product. `createProductPriceHistory` validates the amount, code,
  basis and calendar date; there is no update or delete behavior (TD-016).
- Categories, units and presentations are deactivated rather than deleted so
  later product and operational references keep their identity. Price history is
  immutable and corrections are new effective-dated rows.
- Estimated/measured weight snapshots and operational price consumption are not
  modelled yet. Those are M5/M6 work.

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
- `EmployeeRepository` — find, list, create and update, always scoped by
  organization
- `MeasurementUnitRepository`
- `ProductCategoryRepository`
- `ProductRepository`
- `ProductPresentationRepository`
- `ProductPriceHistoryRepository`
- `UserRepository`
- `SessionRepository`
- `UnitOfWork`

Each engine implements the same ports. Adding a method requires both
implementations (ADR 0025).

## Not yet modeled

- Prices, estimated/measured weights and historical snapshots
- Persisted stock movements, balance strategy, reconciliation and adjustments
- Suppliers and purchases
- Production batches
- Sales checkpoints and daily closing
- Reports and exports

These are product decisions for later milestones, not placeholders to guess at.
