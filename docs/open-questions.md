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

| Earlier question                                | Resolution                                                                                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Warehouse, location or organization-wide stock? | Inventory is organized by **branch**; each branch is independent (BR-022).                                                                                        |
| Can one item have multiple units/conversions?   | The model must support kg, units, trays and configured units (BR-014). Conversion rules remain open (BQ-10).                                                      |
| Are individual sales tracked?                   | No, not in the initial version (BR-009). Sales are aggregate checkpoints.                                                                                         |
| Is WhatsApp integrated?                         | No (BR-027). Manual entry by the central operator.                                                                                                                |
| Who accesses the app initially?                 | One central operator for all branches; branch employees have no access (BR-007, BR-008).                                                                          |
| BQ-03: are confirmed records correctable?       | Yes for M3 purchases: auditable correction with actor, reason, before/after totals and compensating movements; never a silent edit (TD-017).                      |
| BQ-15: is partial receiving allowed?            | No. Receiving is one `DRAFT -> RECEIVED` transition for the full purchase (TD-017).                                                                               |
| BQ-04: what is the estimated cost basis?        | Latest received purchase price for the product in the same branch, when the purchase unit matches the item unit; otherwise `UNAVAILABLE` cost (ADR 0044, TD-021). |

## Open questions

| ID    | Question                                                                                                   | Current assumption                                                                                                                                                                  | Needed by |
| ----- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BQ-01 | What exact fields, order and units do branch employees report through WhatsApp?                            | Not assumed. Keep the checkpoint and report schema generic until confirmed (BR-013).                                                                                                | M6/M8     |
| BQ-02 | Are the ~12:00 and ~20:00 checkpoints fixed, configurable, or only typical reporting times?                | Support two checkpoint periods and day/week/month report granularity; do not hardcode exact times or make periods configurable until confirmed.                                     | M6/M8     |
| BQ-05 | Is raw-material consumption always recorded in production, or only when reliable information is available? | Optional initially.                                                                                                                                                                 | M5        |
| BQ-06 | Are prices and average weights organization-wide or branch-specific?                                       | Catalog and average weight are organization-wide (TD-009, TD-010). Price rows are organization-wide for now (TD-016); scope remains open and must be added explicitly if confirmed. | M2        |
| BQ-07 | Is inventory balance derived from movements or maintained as a cache?                                      | Derived from movements. No cache table exists in M4 (ADR 0041, TD-018).                                                                                                             | M4        |
| BQ-08 | Are negative stock levels ever allowed?                                                                    | No. M4 refuses any operation that would leave a negative balance; an override needs a separate audited decision (ADR 0041, TD-018).                                                 | M4        |
| BQ-09 | When do branch employees/managers need application access, and what may they see?                          | Future only; initial boundary is documented in `ACCESS_MODEL.md` and branch scope remains unimplemented.                                                                            | M9        |
| BQ-10 | Are unit conversions needed between purchase, inventory, production and sales units?                       | Not assumed; products reference explicit units, no conversion factor is stored, and matching-unit cost guards count unavailable cost in closings and reports.                       | M2/M7/M8  |
| BQ-11 | Is there a recipe/bill of materials, or are production inputs free-form per batch?                         | Free-form inputs when present; no recipe entity yet. The M2 raw-to-finished relationship item is deferred to M5 on this basis.                                                      | M5        |
| BQ-12 | Are transfers between branches in scope?                                                                   | No, not in M1–M9.                                                                                                                                                                   | Future    |
| BQ-13 | Is there one supplier delivery shared across branches, or a separate purchase per branch?                  | One purchase belongs to one branch (BR-023); shared delivery is unconfirmed.                                                                                                        | M3        |
| BQ-14 | Are purchase prices tax-inclusive, and are taxes/freight part of cost?                                     | M3 stores unit prices only with no tax or freight fields; M7/M8 cost uses those prices unchanged. Tax-inclusive semantics and later cost treatment remain unconfirmed.              | M3/M7/M8  |
| BQ-16 | Does the business day start/end at local midnight for every branch?                                        | M7 and M8 use local midnight in the organization timezone; branch timezones and non-midnight boundaries are not modeled.                                                            | M7/M8     |
| BQ-17 | Is an explicit "no sales" checkpoint required?                                                             | Not assumed; report sales totals come only from confirmed checkpoint lines.                                                                                                         | M6/M8     |
| BQ-18 | How should mixed measured and estimated tray weights be represented?                                       | Store both bases; do not overwrite one with the other.                                                                                                                              | M5/M6     |
| BQ-19 | What are the names (and optional codes) of the three real branches?                                        | Not invented as real data; the development seed uses three illustrative branch names, which must be replaced when confirmed.                                                        | M2        |
| BQ-20 | Are employees shared across branches, or does each employee belong to one branch?                          | Branch-owned for now, following the proposed domain model (TD-012); a later join table can preserve employee identity if sharing is confirmed.                                      | M2/M5     |
| BQ-21 | Which contact, address, tax, payment-term or account details must a supplier keep beyond its name?         | Not modeled; supplier master data is name-only for now (TD-013). Add fields only when purchases or payables require them.                                                           | M3        |

## Earlier foundation questions still relevant

| Earlier question                            | Status                                                   |
| ------------------------------------------- | -------------------------------------------------------- |
| Item tracked individually (serial/lot)?     | PENDING; quantity-only is the initial assumption.        |
| Multi-organization membership for one user? | PENDING; currently one user belongs to one organization. |
| Should desktop work offline?                | Out of scope; no offline or synchronization.             |
| Reporting granularity for stock valuation?  | PENDING; belongs to reporting and closing.               |
| Which locales beyond English and Spanish?   | English and Spanish only for now.                        |
