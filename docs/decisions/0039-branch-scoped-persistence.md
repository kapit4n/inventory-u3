# ADR 0039 — Branch-scoped persistence

## Status

Accepted — 2026-11-09.

## Context

The business has three independent branches. Each receives its own deliveries,
prepares and sells its own products, and keeps its own inventory. The owner needs
consolidated reporting across all branches, but no operational record may be
shared between two branches by accident.

The existing foundation has one tenant boundary, `Organization`, with users and
sessions scoped by `organization_id`.

## Decision

A `Branch` is a first-class entity owned by an organization. Every future
operational record (purchase, stock movement, adjustment, production batch, sales
checkpoint, daily closing) carries **both** `organization_id` and `branch_id`.

- The branch table exists in both schema trees with identical meaning.
- Repository reads take the organization id explicitly, even when a branch id is
  already known.
- Branch-scoped queries never cross organizations.
- Consolidated reports deliberately query across branches within one
  organization.
- A future user-to-branch assignment can restrict which branches a user may
  access without changing the data boundary.

## Alternatives considered

- **Organization-wide inventory with a free-text location.** Rejected: it cannot
  enforce branch independence or future branch permissions.
- **One organization per branch.** Rejected: the owner needs one consolidated
  tenant and shared master data.
- **Branch id only, no organization id on operational rows.** Rejected: tenant
  safety would depend on an implicit join and a single missed filter would leak
  data.

## Consequences

- Every operational table and repository must carry and validate both scopes.
- The branch entity is implemented in M1-T1; operational tables arrive in later
  milestones.
- Cross-organization isolation needs a test for every new repository.
- The schema is slightly redundant by design; explicit tenant columns are
  preferred over an implicit join.
