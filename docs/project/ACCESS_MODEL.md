# Access Model

> Status: **Access note through M3.** This document defines the confirmed
> access boundary, the implemented foundation and the future branch-access
> constraint. It does not implement branch authorization or settle BQ-09.

## 1. Confirmed requirements

| ID     | Requirement                                                                   | Status    |
| ------ | ----------------------------------------------------------------------------- | --------- |
| BR-007 | One central operator enters information for all three branches.               | CONFIRMED |
| BR-008 | Branch employees do not access the application in the initial version.        | CONFIRMED |
| BR-010 | The owner receives consolidated information across all branches.              | CONFIRMED |
| BR-024 | Owner reports consolidate all three branches.                                 | CONFIRMED |
| BR-025 | The architecture should support future branch-specific users and permissions. | CONFIRMED |
| BR-026 | Initially, only the central operator needs application access.                | CONFIRMED |

Two consequences are often confused:

- **Today:** one operator account, organization-wide operational access.
- **Later:** a branch user may see only assigned branches. The date, roles and
  visible data remain **PENDING** (BQ-09).

## 2. Implemented foundation

The authentication and authorization foundation exists:

- A user belongs to one organization.
- A session belongs to one active user and one organization.
- Protected API routes require a permission; the auth plugin fails closed.
- The request's organization scope comes from the resolved session, never from
  client input.
- The UI may hide an action, but the API permission check is the control.

The existing roles and organization-wide permissions are:

| Permission            | ADMINISTRATOR | MANAGER | STAFF |
| --------------------- | :-----------: | :-----: | :---: |
| `organization:read`   |       ✓       |    ✓    |   ✓   |
| `organization:manage` |       ✓       |         |       |
| `users:read`          |       ✓       |    ✓    |       |
| `users:manage`        |       ✓       |         |       |
| `inventory:read`      |       ✓       |    ✓    |   ✓   |
| `inventory:write`     |       ✓       |    ✓    |   ✓   |
| `reports:read`        |       ✓       |    ✓    |       |

These roles are **organization-wide**. There is no user-to-branch assignment, no
branch dimension in a permission check, and no branch-aware route. Every
authenticated user who has a permission can use it on organization data.

Branch master data follows the same organization-wide model:

- `GET /api/v1/branches` requires `organization:read`; every current role can
  read the branch list, including selectors in later operational forms.
- `POST /api/v1/branches` and `PUT /api/v1/branches/:branchId` require
  `organization:manage`, which only `ADMINISTRATOR` carries today.
- The UI hides create/edit controls from other roles, but the API check is the
  control.
- Edits may rename or deactivate a branch. There is no hard delete, because later
  operational rows will reference the branch.

Employee master data follows the same organization-wide administration boundary:

- `GET /api/v1/employees` requires `organization:read`; every current role can
  read the employee list.
- `POST /api/v1/employees` and `PUT /api/v1/employees/:employeeId` require
  `organization:manage`, which only `ADMINISTRATOR` carries today.
- Creating or editing an employee requires a branch in the caller's organization.
  The API checks this; the selector is only a choice.
- Employees are deactivated, not deleted, so later production rows can keep their
  preparer reference. An employee has no application account.

Supplier master data uses the same organization-wide administration boundary:

- `GET /api/v1/suppliers` requires `organization:read`; every current role can
  read the supplier list.
- `POST /api/v1/suppliers` and `PUT /api/v1/suppliers/:supplierId` require
  `organization:manage`, which only `ADMINISTRATOR` carries today.
- Suppliers are organization-wide and have no branch assignment; M3 purchases
  carry the branch that receives the goods.
- Suppliers are deactivated, not deleted, so later purchases keep their supplier
  reference. Contact, tax and payment details are not modeled yet (BQ-21).

Catalog master data uses the same boundary:

- `GET /api/v1/product-categories`, `GET /api/v1/measurement-units` and product
  presentation and price reads require `organization:read`.
- Category, unit, presentation and price writes require `organization:manage`,
  which only `ADMINISTRATOR` carries today.
- Categories, units and products are organization-wide. Products reference a
  category and units in the caller's organization. Presentations belong to a
  product; reads and writes verify the product belongs to the caller's
  organization.
- Catalog rows are deactivated, not deleted, so products and operational rows
  keep their references. The product screen exposes the presentation editor for
  processed products (TD-015) and a price-history dialog to every authenticated
  role; only administrators can append prices. Price history is immutable and
  organization-wide for now (BQ-06, TD-016).

Purchase registration, receiving, cancellation and correction use the existing
inventory boundary:

- Purchase reads and correction reads require `inventory:read`; every current
  role can read them.
- Create, receive, cancel and correct require `inventory:write`, which
  `ADMINISTRATOR`, `MANAGER` and `STAFF` carry.
- Branch and organization ownership is validated server-side; the branch selected
  in the form is never proof of authorization. This is still organization-wide
  access, not branch-scoped authorization.
- Received purchases are corrected through an audited full reversal with a
  required reason (TD-017). The actor is always the authenticated principal.

## 3. Business actors and the initial version

| Actor              | Initial application access                         | Notes                                                                                           |
| ------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Owner              | None required in the first version                 | Receives consolidated information. Whether the owner later gets a read-only account is PENDING. |
| Central operator   | One account; all three branches                    | Enters purchases, production, checkpoints, adjustments and closing data.                        |
| Branch employee    | None                                               | Reports through WhatsApp; does not log in (BR-008).                                             |
| Future branch user | Not implemented                                    | Would be restricted to assigned branches; timing and visible data are PENDING (BQ-09).          |
| Administrator      | Existing foundation role, not a business actor yet | Manages organization settings and users when such administration exists.                        |

The initial operator can use an existing account with `inventory:read` and
`inventory:write`. If that person also manages users or organization settings,
the account needs the corresponding permissions; this is a deployment choice, not
a new role. Business roles are **PROPOSED**, not implemented.

## 4. Future branch-scoped access

When branch users are introduced, the following invariants apply:

1. A branch assignment is stored server-side and resolved from the authenticated
   user.
2. A client-supplied branch id is a selection, never proof of authorization.
3. A branch user may read or write only assigned branches.
4. Consolidated reports may cross branches only with the required permission,
   and are owner-facing rather than branch-user-facing.
5. The organization boundary is still enforced on every query; branch scope is
   an additional restriction, not a replacement.
6. Audit fields use the authenticated actor, never a client-supplied user id.

The future data shape is expected to include a user-to-branch assignment. No
table, repository, role or permission value is created in M1-T5. ADR 0039
already requires every operational row to carry both organization and branch
ownership, which makes branch-scoped filtering possible later.

## 5. Explicit non-goals for M1-T5

- No `UserBranchAssignment` table or repository.
- No branch-scoped authorization middleware.
- No employee-to-user account link.
- No new `OWNER`, `OPERATOR` or `BRANCH_USER` role.
- No permission changes or UI gating.
- No user administration screen.
- No audit-log implementation.

## 6. Open questions

| ID    | Question                                                                                         | Status                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| BQ-09 | When do branch users need access, and what may they see?                                         | PENDING; nothing is implemented.                                                                                |
| BQ-03 | Who may correct confirmed production/checkpoint records, and what approval evidence is required? | PENDING for those records; M3 purchases use `inventory:write` plus a required reason and before/after evidence. |
| BQ-21 | Which supplier contact, tax and payment details are required?                                    | PENDING; suppliers are name-only for now (TD-013).                                                              |
| —     | Does the owner need an application account, or receive reports outside the app?                  | PENDING.                                                                                                        |
| —     | May one user belong to more than one branch, and may they also have organization-wide access?    | PENDING.                                                                                                        |
| —     | Who administers users and passwords beyond the initial operator?                                 | PENDING.                                                                                                        |

## 7. Implementation path

M9 owns branch-scoped authorization and user-branch administration. Until then:

- the central operator remains organization-wide;
- branch employees have no accounts;
- all branch-owned records still carry both `organizationId` and `branchId`;
- every new repository must enforce organization scope and be ready to enforce a
  server-derived branch restriction.

See [ADR 0039](../decisions/0039-branch-scoped-persistence.md),
[BUSINESS_REQUIREMENTS.md](./BUSINESS_REQUIREMENTS.md) and
[open-questions.md](../open-questions.md).
