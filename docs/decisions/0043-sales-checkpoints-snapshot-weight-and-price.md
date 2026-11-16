# ADR 0043 — Sales checkpoints snapshot weight and price, then post one ledger movement per line

## Status

Accepted — 2026-11-16. Period names and WhatsApp reporting fields remain
provisional pending BR-013/BQ-02.

## Context

M6 records aggregate sales reported by each branch. A checkpoint is not a sale
transaction: it belongs to one branch, business date and period and aggregates
sold quantities by product. Processed products are usually reported as tray
counts whose weight must be estimated from the presentation, while raw products
are reported by their sales unit. Selling prices are effective-dated and can
change later, so confirmed sales history must not be recomputed from current
master data.

The M4 ledger is append-only and exact in integer thousandths. M6 had to decide
how checkpoint lines become stock decreases, how weight and price are preserved,
and how a confirmed checkpoint is corrected. BR-013 has not confirmed the exact
WhatsApp message fields or final period configuration, so M6 implements a generic
model rather than finalizing the reporting contract.

## Decision

- A checkpoint stores branch, business date, `MORNING | EVENING` period,
  registering user, optional note, `DRAFT | CONFIRMED | CORRECTED` status and
  confirmation/correction audit fields. Branch/date/period is unique.
- At least one product line is required. A no-sales checkpoint is not supported
  until BQ-17 is resolved.
- Raw lines require an active `RAW` product, a positive `quantityMilli`, no tray
  or weight fields and `weightBasis = NOT_APPLICABLE`. The sales unit must equal
  the inventory unit; unit conversion is deferred (BQ-10).
- Processed lines require an active `PROCESSED` product and presentation, a
  positive tray count and a snapshotted `averageWeightPerTrayGrams`.
  `estimatedWeightGrams = trayCount × averageWeight`, and `quantityMilli` is
  `measuredWeightGrams ?? estimatedWeightGrams`. The basis is `MEASURED` when a
  measured weight is present and `ESTIMATED` otherwise. Grams map 1:1 to
  milli-kilograms, so the inventory unit must be `kg`.
- Every line snapshots the selling price effective on or before the business
  date: amount in integer minor units, basis and currency. Raw lines require
  `PER_SALES_UNIT`; processed lines require `PER_KILOGRAM`. A missing price
  blocks checkpoint creation.
- `estimatedSalesValueMinor = floor((quantityMilli × amountMinor + 500) / 1000)`
  using integer-safe arithmetic. It is a snapshot and is never recomputed.
- Confirmation is one `DRAFT -> CONFIRMED` transition that appends negative
  movements with reason and source `SALES_CHECKPOINT`. Negative resulting stock
  is refused before any movement is written.
- A confirmed checkpoint can be corrected once with a required reason. Correction
  writes compensating `CORRECTION` movements linked to the originals and moves
  the checkpoint to `CORRECTED`. Drafts can be discarded; confirmed and corrected
  checkpoints cannot be deleted.
- Reads use `inventory:read`; writes use `inventory:write`.

## Alternatives considered

- **Store only product ids and recompute weight/price at display time.** Rejected:
  presentation edits and new prices would rewrite historical sales.
- **Treat a checkpoint as one line per movement.** Rejected: the business reports
  an aggregate period, not individual sales, and the checkpoint is the unit of
  confirmation and correction.
- **Require a no-sales state for every period.** Rejected for M6 because BQ-17 is
  unresolved; adding it silently would invent a reporting rule.
- **Convert units inside the checkpoint.** Rejected: no conversion model exists
  (BQ-10); accepting mismatched raw sales and inventory units would make the
  ledger quantity ambiguous.
- **Allow repeated corrections or draft editing.** Rejected: one audited full
  reversal matches M3/M5 and keeps the ledger explainable. A richer history model
  needs its own decision.

## Consequences

- Sales history is immutable after confirmation except through one audited
  correction.
- M7 closing can reuse checkpoint quantities and values without reading current
  prices or presentation weights.
- Confirmation and correction must run transactionally with movement writes.
- Final WhatsApp field names, mandatory fields, message format and final period
  naming wait for BR-013/BQ-02. A no-sales checkpoint waits for BQ-17.
