# ADR 0042 — Production snapshots drive the stock ledger

## Status

Accepted — 2026-11-15.

## Context

M5 records branch tray production. A batch must preserve the preparer, the
operator who registered it, the presentation, the tray count and the average
weight used at that moment. Product master data can change later: presentations
can be edited or deactivated, and average weights can be corrected. M6 sales
checkpoints and M7 closing must be able to read historical production without
reinterpreting it through current product configuration.

M4 established an append-only stock ledger in exact integer thousandths. M5 had
to decide how production output weight, raw inputs and waste become movements,
and how a confirmed batch is corrected.

## Decision

- A production batch belongs to one branch and stores the business date, the
  employee who prepared it, the user who registered it, an optional note and
  `DRAFT | CONFIRMED | CORRECTED` status.
- Outputs snapshot `averageWeightPerTrayGrams` and `estimatedWeightGrams` when
  the batch is created. `estimatedWeightGrams` is `trayCount × averageWeight`.
  An optional `measuredWeightGrams` uses `weightBasis = MEASURED`; otherwise the
  basis is `ESTIMATED`. Later presentation edits never rewrite these values.
- Outputs require products of kind `PROCESSED`, raw inputs require kind `RAW`,
  and every referenced product must be active. Inputs carry the product's
  inventory unit and quantity in exact integer thousandths. Waste may reference
  any active product.
- A batch may contain inputs, outputs and waste. At least one line is required.
  Inputs and waste are optional; waste-only and input-only batches are valid.
- Confirmation is one `DRAFT -> CONFIRMED` transition. It aggregates the net
  stock delta per product and appends one movement per affected product:
  raw inputs negative (`PRODUCTION_INPUT`), outputs positive (`PRODUCTION_OUTPUT`)
  and waste negative (`WASTE`), all with source type `PRODUCTION_BATCH`. Output
  quantity is `measuredWeightGrams ?? estimatedWeightGrams`, where grams map 1:1
  to milli-kilograms.
- A branch balance may never go negative. `INSUFFICIENT_STOCK` is refused before
  writing any movement.
- A confirmed batch can be corrected once through an audited full reversal. The
  correction writes compensating `CORRECTION` movements linked to the originals
  by `correctsMovementId`, stores actor, time and reason, and moves the batch to
  `CORRECTED`. Drafts can be discarded; confirmed and corrected batches cannot
  be deleted.
- Production price valuation is not stored. M5 records quantities and weight
  only.

## Alternatives considered

- **Read the average weight from the presentation at display time.** Rejected:
  editing a presentation would silently change historical production weight and
  make later sales and closing reports irreconcilable.
- **Store only the total weight.** Rejected: tray count and the per-tray snapshot
  are the evidence the business reports, and the estimate must remain
  distinguishable from a measured weight.
- **Overwrite the batch on edit.** Rejected: it would rewrite ledger history and
  remove the audit trail.
- **Require raw inputs.** Rejected: the business records consumption only when
  reliable (BBR-020 / BQ-11), so missing inputs must remain explicitly absent.
- **Require an output or waste line.** Rejected for the domain because free-form
  input-only batches are valid data, even though the normal workflow produces
  finished trays. The UI may still guide operators toward outputs.
- **Allow several corrections.** Rejected for M5: a second correction would
  require reversal of a reversal and a new state model. One audited correction is
  sufficient for the current milestone.

## Consequences

- Production history is immutable after confirmation except through a correction.
- M6 and M7 can read snapshotted weights and presentation identifiers without
  consulting current product configuration.
- Confirmation and correction must run transactionally with the movement writes.
- The ledger remains the single source of stock truth; production adds no balance
  cache.
- If recipes, partial corrections or production valuation are confirmed, each
  needs an explicit schema and workflow decision rather than reinterpretation of
  these rows.
