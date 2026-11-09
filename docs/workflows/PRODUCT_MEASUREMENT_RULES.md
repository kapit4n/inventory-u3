# Product Measurement Rules

> Implementation status: **PARTIALLY_IMPLEMENTED.** Measurement units, product
> categories, product unit references, presentation identities, the
> raw/processed product kind and the configured average weight per tray exist in
> the domain and both databases. Estimated/measured weights, snapshots and
> prices do **not** exist yet.
> Sources: BR-014 to BR-021 in
> [BUSINESS_REQUIREMENTS.md](../project/BUSINESS_REQUIREMENTS.md).

## 1. Concepts

| Term                    | Meaning                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| Measurement unit        | A configured unit such as kilogram, unit or tray.                 |
| Purchase unit           | The unit in which a supplier sells a product.                     |
| Inventory unit          | The unit in which stock is counted and reconciled.                |
| Production unit         | The unit used to report production output, usually trays.         |
| Sales unit              | The unit used at a sales checkpoint: kilogram, unit or tray.      |
| Presentation            | The physical format sold, e.g. a covered tray.                    |
| Average weight per tray | Configured weight per tray; stored as integer grams, shown as kg. |
| Estimated weight        | Kilograms derived from tray count × average weight per tray.      |
| Measured weight         | Kilograms read from a scale.                                      |

A product may use different units for purchase, inventory, production and sales,
but the initial version must not assume conversion factors between them unless a
confirmed requirement exists. Conversion is an open question.

## 2. Raw products

Rules:

1. A raw product uses its configured unit directly.
2. No tray conversion is applied.
3. If sold by kilogram, the sales quantity is kilograms.
4. If sold by unit, the sales quantity is a unit count.
5. The system must not invent a weight for a product sold by unit.

Examples:

- Bananas received and sold by kilogram: `12.5 kg`.
- Lemons received by box and sold by unit: `40 units`.

## 3. Processed products

A processed product is prepared by a branch as covered trays.

Required configuration:

- average weight per tray, in kilograms;
- selling price per kilogram;
- presentation, e.g. covered tray;
- production/sales unit, normally tray.

Derived values:

```text
estimatedWeightKg = trayCount × averageWeightPerTrayKg
estimatedSalesValue = estimatedWeightKg × sellingPricePerKg
```

Worked example (from the business requirements):

```text
30 trays × 0.500 kg = 15.0 kg estimated weight
15.0 kg × 4.00 per kg = 60.00 estimated sales value
```

The example uses a price per kilogram. The actual currency comes from the
organization/price record; the calculation must use integer minor units for money
(see TD-006).

## 4. Estimated vs measured weight

The system must never present an estimate as a measurement.

- Every record that carries weight must indicate whether it is `ESTIMATED` or
  `MEASURED`.
- Estimated weight is derived from a tray count and a snapshotted average weight.
- Measured weight is entered directly and may differ from the estimate.
- If both exist for the same record, both must be stored; one must not overwrite
  the other silently.
- Reports must label estimated values, including totals that are sums of
  estimates.

## 5. Snapshots

A historical production or sales record preserves the values used at the time:

| Snapshot                              | Production | Sales checkpoint |
| ------------------------------------- | ---------- | ---------------- |
| Product / presentation reference      | Required   | Required         |
| Tray quantity                         | Required   | When applicable  |
| Average weight per tray (kg)          | Required   | When applicable  |
| Estimated total weight (kg)           | Required   | When applicable  |
| Selling price per kg / per unit       | —          | Required         |
| Estimated sales value                 | —          | Required         |
| Weight basis (`ESTIMATED`/`MEASURED`) | Required   | Required         |
| Branch, business date, actor          | Required   | Required         |

Rules:

1. Write snapshots at confirmation, in the same transaction as the record.
2. Never recompute history from current product configuration.
3. Changing the average weight or price affects only future records.
4. A correction must preserve the before/after values in an audit trail.

## 6. Precision and rounding

The configured average weight is stored as a positive integer number of grams
(TD-010). This is exactly the proposed 0.001 kg precision, without binary
floating point.

Still proposed or pending:

- How snapshots display or round kilograms; the proposed display is three
  decimal places.
- How estimated totals round when combining trays.
- Money remains integer minor units (TD-006).
- Round only at the point where a value becomes a stored snapshot or a displayed
  total, and record the rule in the implementation.
- Do not use binary floating point for money.

## 7. Validation rules (proposed)

- Tray count must be a non-negative number; a production or sales line of zero is
  allowed only if the workflow explicitly needs it.
- Average weight per tray must be positive for processed products.
- Selling price must be non-negative.
- A raw product must not require an average weight per tray.
- A processed product must not silently fall back to a raw unit.
- Estimated kilograms must be stored separately from measured kilograms.
- Currency must match the organization/price context; see the open question on
  branch-specific prices.

Enforced today: `ProductPresentation.averageWeightGrams` must be a positive whole
number. The remaining rules depend on production and sales workflows that do not
exist yet.

## 8. Open questions

1. Is the average weight configured per product, per presentation, or per branch?
2. Are selling prices organization-wide or branch-specific?
3. How often may average weight and price change, and are changes effective-dated?
4. Are weights rounded per tray, per batch, or only at the total?
5. When a branch weighs some trays and estimates others, how is the mixed case
   represented?
6. Are unit conversions ever needed between purchase, inventory and sales units?
