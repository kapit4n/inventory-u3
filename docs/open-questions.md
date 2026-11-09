# Open Questions

These require product input. Do not resolve them silently in code. The confirmed
business requirements are in
[BUSINESS_REQUIREMENTS.md](./project/BUSINESS_REQUIREMENTS.md); the implementation
sequence is in
[IMPLEMENTATION_ROADMAP.md](./development/IMPLEMENTATION_ROADMAP.md).

When a question is answered:

1. Record the answer in the relevant requirements/workflow document.
2. If the answer changes the architecture, write an ADR or a decision in
   [TECHNICAL_DECISIONS.md](./project/TECHNICAL_DECISIONS.md).
3. Update this table and the corresponding item in
   [KNOWN_ISSUES.md](./development/KNOWN_ISSUES.md).

## Confirmed resolutions from the business requirements

These replace the earlier generic foundation assumptions:

| Earlier question                                | Resolution                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Warehouse, location or organization-wide stock? | Inventory is organized by **branch**; each branch is independent (BR-022).                                   |
| Can one item have multiple units/conversions?   | The model must support kg, units, trays and configured units (BR-014). Conversion rules remain open (BQ-10). |
| Are individual sales tracked?                   | No, not in the initial version (BR-009). Sales are aggregate checkpoints.                                    |
| Is WhatsApp integrated?                         | No (BR-027). Manual entry by the central operator.                                                           |
| Who accesses the app initially?                 | One central operator for all branches; branch employees have no access (BR-007, BR-008).                     |

## Open questions

| ID    | Question                                                                                                     | Current assumption                                                                                                                             | Needed by |
| ----- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BQ-01 | What exact fields, order and units do branch employees report through WhatsApp?                              | Not assumed. Keep the checkpoint schema generic until confirmed (BR-013).                                                                      | M6        |
| BQ-02 | Are the ~12:00 and ~20:00 checkpoints fixed, configurable, or only typical reporting times?                  | Support two periods; do not hardcode exact times until confirmed.                                                                              | M6        |
| BQ-03 | Are confirmed purchases/production/checkpoints correctable? Who may correct them and what audit is required? | Assume auditable corrections, never silent edits. Stock corrections follow ADR 0040.                                                           | M3/M5/M6  |
| BQ-04 | What is the estimated cost basis for daily closing: latest price, weighted average, FIFO, manual?            | Not decided. Do not hardcode one.                                                                                                              | M7        |
| BQ-05 | Is raw-material consumption always recorded in production, or only when reliable information is available?   | Optional initially.                                                                                                                            | M5        |
| BQ-06 | Are prices and average weights organization-wide or branch-specific?                                         | Catalog and average weight are organization-wide (TD-009, TD-010). Price scope remains open; price history should support later scope.         | M2        |
| BQ-07 | Is inventory balance derived from movements or maintained as a cache?                                        | Decide before M4; movements remain the source of truth. Only the balance shape exists today.                                                   | M4        |
| BQ-08 | Are negative stock levels ever allowed?                                                                      | Refuse by default; any override must be explicit and audited. The movement factory does not enforce a balance.                                 | M4        |
| BQ-09 | When do branch employees/managers need application access, and what may they see?                            | Future only; initial boundary is documented in `ACCESS_MODEL.md` and branch scope remains unimplemented.                                       | M9        |
| BQ-10 | Are unit conversions needed between purchase, inventory, production and sales units?                         | Not assumed; products reference explicit units and no conversion factor is stored.                                                             | M2        |
| BQ-11 | Is there a recipe/bill of materials, or are production inputs free-form per batch?                           | Free-form inputs when present; no recipe entity yet.                                                                                           | M5        |
| BQ-12 | Are transfers between branches in scope?                                                                     | No, not in M1–M9.                                                                                                                              | Future    |
| BQ-13 | Is there one supplier delivery shared across branches, or a separate purchase per branch?                    | One purchase belongs to one branch (BR-023); shared delivery is unconfirmed.                                                                   | M3        |
| BQ-14 | Are purchase prices tax-inclusive, and are taxes/freight part of cost?                                       | Not modeled; do not add tax fields without confirmation.                                                                                       | M3/M7     |
| BQ-15 | Is partial receiving allowed?                                                                                | Not assumed.                                                                                                                                   | M3        |
| BQ-16 | Does the business day start/end at local midnight for every branch?                                          | Use the organization timezone; branch timezones are not modeled.                                                                               | M7        |
| BQ-17 | Is an explicit "no sales" checkpoint required?                                                               | Not assumed.                                                                                                                                   | M6        |
| BQ-18 | How should mixed measured and estimated tray weights be represented?                                         | Store both bases; do not overwrite one with the other.                                                                                         | M5/M6     |
| BQ-19 | What are the names (and optional codes) of the three real branches?                                          | Not invented; the schema exists but development branching data is not seeded.                                                                  | M2        |
| BQ-20 | Are employees shared across branches, or does each employee belong to one branch?                            | Branch-owned for now, following the proposed domain model (TD-012); a later join table can preserve employee identity if sharing is confirmed. | M2/M5     |

## Earlier foundation questions still relevant

| Earlier question                            | Status                                                   |
| ------------------------------------------- | -------------------------------------------------------- |
| Item tracked individually (serial/lot)?     | PENDING; quantity-only is the initial assumption.        |
| Multi-organization membership for one user? | PENDING; currently one user belongs to one organization. |
| Should desktop work offline?                | Out of scope; no offline or synchronization.             |
| Reporting granularity for stock valuation?  | PENDING; belongs to reporting and closing.               |
| Which locales beyond English and Spanish?   | English and Spanish only for now.                        |
