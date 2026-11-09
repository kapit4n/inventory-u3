# Current Task

> Last updated: 2026-11-09.
>
> **No feature task is currently in progress.** M1-T3 (raw/processed and
> average-weight configuration) is complete. The next task is M1-T4.

## Task identity

| Field        | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| Milestone    | M1 — Business Domain Foundation                            |
| Task ID      | M1-T4                                                      |
| Task         | Stock movement, balance and audit-safe correction concepts |
| Status       | NOT_STARTED (ready)                                        |
| Dependencies | M1-T3 complete; TD-001, TD-009 and TD-010 accepted         |
| Blocks       | M1-T5, M1-T6, M4, M5, M6, M7                               |

## Objective

Define the domain vocabulary and invariants for stock before any stock table or
inventory screen exists. The movement is the append-only source of truth; a
correction is another movement, never an edit that erases what happened.

This task is conceptual and framework-independent. It must not build the stock
ledger, balances, reconciliation screen or any API.

## Context

- Branch is the inventory boundary (TD-001); every movement belongs to one
  organization and one branch.
- Products now carry an inventory unit and a raw/processed kind. Quantities in
  the stock domain use the product's inventory unit; no conversion is applied
  (BQ-10).
- M4 owns the persisted ledger, balance strategy and inventory UI. M1-T4 defines
  the vocabulary those pieces must obey.
- BQ-07 (derived vs cached balance), BQ-08 (negative stock), the initial-stock
  rule and correction permissions are open. Do not resolve them by guessing.
- Sales are aggregate checkpoints, not individual transactions (BR-009).
- A correction must preserve the original record and be explainable later.

Read before starting:

1. [BUSINESS_REQUIREMENTS.md](../project/BUSINESS_REQUIREMENTS.md) — branch,
   stock and sales requirements.
2. [INVENTORY_WORKFLOW.md](../workflows/INVENTORY_WORKFLOW.md) — sections 2–5.
3. [BUSINESS_DOMAIN_MODEL.md](../project/BUSINESS_DOMAIN_MODEL.md) — branch
   ownership and stock entities.
4. [open-questions.md](../open-questions.md) — BQ-03, BQ-07, BQ-08, BQ-10.
5. The implemented branch/product slice and ADR 0039.

## Files and modules involved

- `packages/domain/src/stock/` (new) and `packages/domain/src/index.ts`.
- `packages/domain/src/ports/index.ts` only if a port is genuinely needed now.
- Tests colocated with the domain.
- `docs/decisions/` for the append-only correction decision if it is recorded as
  an ADR.
- Documentation after implementation.

## Proposed domain concepts

Keep the first version explicit and small:

- `StockMovementReason` — a controlled list covering receiving, production
  input/output, sales checkpoint, adjustment, waste and correction. Do not add
  reasons for workflows that do not exist.
- `StockMovement` — immutable organization/branch/product reference, signed
  `quantityDelta`, reason, optional source reference, optional
  `correctsMovementId`, business time, recording time, actor and note.
- `StockBalance` — a read-model concept for quantity on hand per branch and
  product. Decide whether it is a type only in M1-T4; do not add a table while
  BQ-07 is open.
- A correction references the movement it corrects. The original is never
  mutated or deleted. Do not implement reversal arithmetic without the original
  row.
- No negative-stock policy, opening-balance rule or approval workflow is
  implemented in this task.

## Acceptance criteria

- [ ] Stock concepts are pure TypeScript and import only `@inventory-u3/types`
      and domain shared modules.
- [ ] A stock movement carries organization, branch, product, a non-zero signed
      quantity, a controlled reason and its audit fields.
- [ ] A movement is immutable in the type; no update/delete API is introduced.
- [ ] A correction references the corrected movement id rather than replacing it.
- [ ] Balance remains a concept only; no stock table or migration is added.
- [ ] Open questions BQ-03, BQ-07 and BQ-08 are not silently answered.
- [ ] Domain tests cover quantity, reason, correction and required-reference
      invariants.
- [ ] If the append-only rule is recorded as an ADR, the ADR is linked from the
      implementation notes and decision index.
- [ ] `pnpm run guard:boundaries`, `typecheck`, `lint` and `test` pass.
- [ ] Documentation states what is conceptual versus persisted.

## Tests required

- Domain tests for valid movement creation.
- Zero, non-finite and invalid-quantity rejection.
- Unknown reason rejection.
- Correction-reference validation.
- A test asserting that the public model exposes no mutation of an existing
  movement.

No repository or migration test is required unless persistence is deliberately
added; if it is, both engines must change together.

## Remaining steps

1. Re-read the requirements, inventory workflow and open questions.
2. Decide the exact M1-T4 domain boundary and record it here before coding.
3. Implement the stock concepts and tests without adding stock tables.
4. Record the append-only correction principle in an ADR if it is architectural.
5. Run the verification commands.
6. Update `IMPLEMENTATION_PROGRESS.md`, the roadmap, this file, `SESSION_LOG.md`,
   `KNOWN_ISSUES.md`, `docs/domain.md` and the model/workflow documents.
7. Choose M1-T5 (access-model note) or the next roadmap task.

## Out of scope for this task

- Stock tables, migrations, repositories or API routes.
- Balance calculation, negative-stock enforcement or cache strategy.
- Purchases, production, sales checkpoints, reconciliation or closing.
- Stock UI, reports or seeding.
- Unit conversion arithmetic.
