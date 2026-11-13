# Current Task

> Last updated: 2026-11-09.
>
> **M2-T3 is COMPLETE.** M2-T1 branch and M2-T2 employee management are also
> complete. This slice adds organization-wide supplier master data for the
> purchases recorded in M3. The work is uncommitted pending explicit
> authorization.

## Task identity

| Field        | Value                                                    |
| ------------ | -------------------------------------------------------- |
| Milestone    | M2 — Master Data                                         |
| Task ID      | M2-T3                                                    |
| Task         | Supplier master data                                     |
| Status       | COMPLETED                                                |
| Dependencies | M2-T1 and M2-T2 complete; organization permissions exist |
| Blocks       | M3 supplier purchases and receiving                      |

## Objective

Let an authenticated administrator list, create and edit the suppliers that
deliver products to the business. Provide read-only supplier visibility to the
other authenticated roles and a typed API that M3 purchases can reference.

## Scope

- Add a `Supplier` entity with a name and active flag.
- Add a `SupplierId` branded identifier and repository port.
- Keep suppliers organization-wide because the same provider can deliver to more
  than one branch; M3 purchases carry the branch.
- Deactivate rather than delete suppliers so later purchases keep their supplier
  reference.
- Add `GET`, `POST` and `PUT /api/v1/suppliers` routes.
- Use `organization:read` for listing and `organization:manage` for writes, the
  same administration boundary as branches and employees (TD-011, TD-012).
- Add typed REST-client functions and response validation.
- Add supplier management to Settings, read-only for non-administrators.
- Add domain, dual-engine repository, route, REST-client and component tests.
- Update the domain, backend, access, progress, roadmap, state, known-issues and
  session documentation.

## Out of scope

- Supplier contact details, addresses, tax identifiers, payment terms, accounts
  payable or taxes (BQ-21).
- Supplier-branch assignment or supplier-specific purchase prices.
- Purchases, receiving, stock effect or purchase history (M3).
- Supplier login accounts.
- Hard deletion.
- Seeding real suppliers; their names and data are not confirmed.

## Assumptions and open questions

- **Assumption:** suppliers are organization-wide, not branch-owned. The same
  supplier may deliver to several branches and each purchase records its branch.
- **Assumption:** supplier names are not unique. Duplicate names are allowed and
  the supplier identity is the id.
- **OPEN QUESTION (BQ-21):** which contact, tax and payment details suppliers
  need beyond a name. None are modeled yet.
- Suppliers are deactivated; they are never hard-deleted.
- `Supplier` contains no application-user link.

## Acceptance criteria

- [x] A supplier name is trimmed and validated by the domain on create and update.
- [x] Every supplier read and write is scoped to the caller's organization.
- [x] Both engines implement `findById`, `listByOrganization`, `create` and
      `update`, with migrations and parity.
- [x] Supplier routes require authentication and the documented permissions.
- [x] Settings lists suppliers and lets an administrator create, edit and
      deactivate them.
- [x] Non-administrators see suppliers read-only and cannot call write routes.
- [x] Tests cover domain rules, both repository methods, routes, REST client and
      the Settings component.
- [x] Typecheck, lint, unit/integration tests, guard, build and formatting pass.

## Completion record

- Implementation and documentation are in the working tree; no commit was made
  without explicit authorization.
- Verified: typecheck 12/12, lint 12/12 with `BOUNDARY GUARD OK`, unit/component
  234 passed + 8 skipped, SQLite integration 53 passed + 8 skipped, build 5/5,
  SQLite migrations through `0005`, seed, and formatting.
- PostgreSQL repository cases were skipped because no server is available.
- No supplier seed was added because real supplier data is unavailable.
- Suppliers are organization-wide and names are not unique (TD-013); extra
  supplier fields remain open (BQ-21).

## Next task

M2-T4 category, unit and presentation master data. Do not seed suppliers until
real supplier data is available.
