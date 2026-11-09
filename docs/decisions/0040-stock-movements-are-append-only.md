# ADR 0040 — Stock movements are append-only; corrections reference the original

## Status

Accepted — 2026-11-09.

## Context

Inventory is kept independently per branch. The business needs to explain why a
quantity changed, including when a central operator corrects a mistaken entry.
Editing or deleting a movement would erase that explanation and make later
reports impossible to reconstruct.

The inventory workflow already says corrections must preserve the original. M4
will persist the ledger, but the rule must exist before a table shape is chosen.

## Decision

A `StockMovement` is immutable. The domain exposes creation only, freezes the
returned value at runtime, and provides no update or delete operation.

- A correction is another movement with reason `CORRECTION`.
- `correctsMovementId` is required on a correction and must point at a different
  movement.
- A non-correction movement must not carry `correctsMovementId`.
- The original movement remains unchanged and visible.
- Reversal arithmetic needs both rows and belongs to the service that reads
  them, not to the movement factory.
- Persistence in M4 must preserve this rule: no destructive update of a movement
  row, and corrections are new rows.

## Alternatives considered

- **Edit the mistaken movement in place.** Rejected: it destroys the audit trail
  and makes historical reports irreproducible.
- **Delete and recreate the movement.** Rejected for the same reason, and it
  hides that a correction happened.
- **Store correction data on the original row.** Rejected: it would require
  mutating the original and make multiple corrections ambiguous.
- **Enforce reversal arithmetic in the domain factory.** Deferred: the factory
  does not have the original row, and BQ-07/BQ-08 are still open.

## Consequences

- Every correction needs a new id, actor, recording time and note explaining the
  change.
- Reports and balances must include correction movements rather than hiding
  them.
- M4 must test that a correction leaves the original row untouched.
- Approval rules and who may record corrections remain open.
