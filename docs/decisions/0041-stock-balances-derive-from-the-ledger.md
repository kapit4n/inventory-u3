# ADR 0041 — Stock balances derive from the append-only ledger

## Status

Accepted — 2026-11-15.

## Context

M3 already persists an append-only stock movement for every receiving and
purchase correction. M4 must expose balances per branch and product, plus
adjustments, waste and reconciliation. Two questions were still open:

- BQ-07: derive balances from movements, or maintain a cached balance?
- BQ-08: may stock become negative?

A cache would introduce a second source of truth that can drift from the ledger.
Negative stock would let a correction, waste or adjustment invent inventory that
was never received.

## Decision

- A branch/product balance is **derived** by summing its stock movements. There
  is no `stock_balances` table in M4.
- Movement quantities are exact integer thousandths, matching purchase
  quantities. The database column is `quantity_delta_milli`.
- The balance query is always scoped by organization and branch. A movement in
  one branch can never contribute to another branch.
- Manual adjustments, waste and reconciliation create movements in the same
  ledger. Reconciliation stores its audit row, and records a movement only when
  the counted quantity differs from the expected quantity.
- Waste quantities are positive; the domain writes the negative stock delta.
- Opening stock is a positive manual adjustment with a required reason.
- M4 refuses any operation whose resulting balance would be negative. There is
  no override. An override would require a separate audited decision and schema.
- Corrections remain new `CORRECTION` movements; the original movement is never
  edited or deleted.

## Alternatives considered

- **Maintain a `stock_balances` cache.** Rejected for M4: it adds a second source
  of truth and synchronization rules before performance requires them. It can
  be introduced later as a derived projection if reads become a bottleneck.
- **Allow negative stock with a warning.** Rejected: it hides receiving mistakes
  and makes waste, sales and closing reports unreconcilable. Any override must
  be explicit and audited.
- **Store reconciliation only as a movement.** Rejected: the expected and counted
  values would be lost. The adjustment row keeps the count evidence.
- **Use floating-point stock quantities.** Rejected: purchase quantities are
  already exact integer thousandths, and floating-point drift is unacceptable in
  an inventory ledger.

## Consequences

- Every balance read aggregates movements; indexes on organization, branch and
  product support the query.
- Existing movements are migrated from decimal quantities to integer thousandths
  in the same migration that adds the new column.
- M3 purchase corrections must check the derived balance before writing their
  compensating movements.
- A balance of zero is a valid result, not evidence that no movements exist.
- Stock reports and closing can reuse the ledger without reconciling a cache.
