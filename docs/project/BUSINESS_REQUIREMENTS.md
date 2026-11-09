# Inventory U3 — Business Requirements

> Source: confirmed business requirements supplied for the project on
> 2026-11-09. This document separates **CONFIRMED** requirements from
> **ASSUMPTION**, **PROPOSED** design and **PENDING** product input.
> Do not promote a proposed detail to confirmed without an explicit decision.

Status vocabulary:

| Status     | Meaning                                                                |
| ---------- | ---------------------------------------------------------------------- |
| CONFIRMED  | Stated as a business requirement. Do not silently change.              |
| ASSUMPTION | A working assumption made to keep design moving; may be wrong.         |
| PROPOSED   | A design suggestion for a future milestone; not a product requirement. |
| PENDING    | Requires product input before the related feature can be finalized.    |

## 1. Business operation

| ID     | Requirement                                                                       | Status    |
| ------ | --------------------------------------------------------------------------------- | --------- |
| BR-001 | The business has three independent branches.                                      | CONFIRMED |
| BR-002 | Each branch receives fruit and vegetable deliveries directly from suppliers.      | CONFIRMED |
| BR-003 | Suppliers may deliver daily, or every one or two days.                            | CONFIRMED |
| BR-004 | Each branch independently prepares covered trays of cut fruit and vegetables.     | CONFIRMED |
| BR-005 | Unprocessed products are also sold, generally by kilogram and sometimes by unit.  | CONFIRMED |
| BR-006 | Branch employees currently send operational information through WhatsApp.         | CONFIRMED |
| BR-007 | One central operator enters information into Inventory U3 for all three branches. | CONFIRMED |
| BR-008 | Branch employees do not access the application in the initial version.            | CONFIRMED |
| BR-009 | Individual sales transactions are not registered in the initial version.          | CONFIRMED |
| BR-010 | The system consolidates all branches for the owner.                               | CONFIRMED |

## 2. Sales checkpoints

| ID     | Requirement                                                                                                                                    | Status    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BR-011 | Expected daily reporting periods are approximately 12:00 and 20:00.                                                                            | CONFIRMED |
| BR-012 | The system must support aggregate sales reporting by branch and product.                                                                       | CONFIRMED |
| BR-013 | The exact information employees report through WhatsApp is not yet finalized and must remain configurable or explicitly documented as pending. | PENDING   |

Consequences:

- A sales checkpoint is an **aggregate** record, not a list of customer sales.
- The morning and evening checkpoints are the initial expected periods. Whether
  their times are fixed, configurable, or only descriptive is **PENDING**.
- Do not invent the final WhatsApp message format, mandatory fields, or the
  exact checkpoint naming.

## 3. Product measurement

| ID     | Requirement                                                                                                               | Status    |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | --------- |
| BR-014 | Support kilograms, units, trays, and other configurable purchase or inventory units where appropriate.                    | CONFIRMED |
| BR-015 | A processed/finished product has a configurable average weight per tray.                                                  | CONFIRMED |
| BR-016 | The system estimates kilograms from the number of trays: `trays × average weight per tray`.                               | CONFIRMED |
| BR-017 | Processed-product sales are calculated using estimated kilograms multiplied by the applicable selling price per kilogram. | CONFIRMED |
| BR-018 | Every historical production and sales record preserves the average-weight and price snapshots used at the time.           | CONFIRMED |
| BR-019 | Changing a product's average weight must not recalculate historical records.                                              | CONFIRMED |
| BR-020 | The system must clearly distinguish estimated weight from actual measured weight.                                         | CONFIRMED |
| BR-021 | For unprocessed products, quantities use their configured measurement unit without tray conversion.                       | CONFIRMED |

Worked example from the requirements:

```text
30 trays × 0.500 kg per tray = 15 kg estimated weight
15 kg × selling price per kg = estimated sales value
```

Measurement terms and formulas are detailed in
[PRODUCT_MEASUREMENT_RULES.md](../workflows/PRODUCT_MEASUREMENT_RULES.md).

## 4. Branch independence

| ID     | Requirement                                                                                         | Status    |
| ------ | --------------------------------------------------------------------------------------------------- | --------- |
| BR-022 | Inventory is independent per branch.                                                                | CONFIRMED |
| BR-023 | Purchases, production, sales, adjustments and daily closing must identify the corresponding branch. | CONFIRMED |
| BR-024 | Owner reports must consolidate all three branches.                                                  | CONFIRMED |
| BR-025 | The architecture should support future branch-specific users and permissions.                       | CONFIRMED |
| BR-026 | Initially, only the central operator needs application access.                                      | CONFIRMED |

Design consequences:

- Every operational table must carry a branch reference in addition to the
  organization reference. See
  [BUSINESS_DOMAIN_MODEL.md](./BUSINESS_DOMAIN_MODEL.md).
- A future branch user must only see their assigned branch(es). That permission
  model is **PROPOSED** and not implemented.
- Consolidated reporting across branches is owner-facing; branch-scoped data is
  operator-facing. The report layer must not accidentally mix the two.

## 5. WhatsApp

| ID     | Requirement                                                     | Status    |
| ------ | --------------------------------------------------------------- | --------- |
| BR-027 | No WhatsApp API integration is required in the initial version. | CONFIRMED |
| BR-028 | WhatsApp remains an external communication channel.             | CONFIRMED |
| BR-029 | The central operator manually enters the information received.  | CONFIRMED |

Consequences:

- Do not add a WhatsApp client, webhook, bot or external API dependency.
- The application may still model the **information** the operator receives, once
  the reporting format is confirmed (BR-013).

## 6. Initial scope boundaries

These are boundaries of the first business version, derived from the confirmed
requirements:

| In scope (eventually)                                    | Out of scope initially                                    |
| -------------------------------------------------------- | --------------------------------------------------------- |
| Branch-aware purchases, production, checkpoints, closing | Individual customer sales / POS                           |
| Aggregate sales by branch and product                    | Branch employee login and mobile access                   |
| Estimated weight and price snapshots                     | WhatsApp integration                                      |
| Consolidated owner reporting                             | Multi-organization tenancy beyond the existing foundation |
| Audit history for corrections                            | Offline mode and synchronization                          |
| Supplier purchase history                                | Advanced accounting, tax or payroll                       |

Anything not listed as confirmed above is a proposal. The current repository
implements none of the business capabilities in this table; see
[IMPLEMENTATION_PROGRESS.md](../development/IMPLEMENTATION_PROGRESS.md).

## 7. Open business questions

The unresolved questions are tracked in
[open-questions.md](../open-questions.md) and summarized in
[KNOWN_ISSUES.md](../development/KNOWN_ISSUES.md). The most important are:

1. What exact fields do branch employees report through WhatsApp, and in what
   order/format? (BR-013)
2. Are the 12:00 and 20:00 checkpoints fixed, configurable, or just typical?
3. Are checkpoint corrections allowed after submission? Who may correct them,
   and what audit evidence is required?
4. How is the estimated cost of goods calculated for daily closing: latest
   purchase price, weighted average, or another basis?
5. Is raw-material consumption always recorded, or only when the branch reports
   reliable quantities?
6. Do all three branches share the same product catalogue and prices, or are
   prices branch-specific?
7. When do branch users need application access, and what may they see?
