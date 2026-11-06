# Open questions

These need product input before the inventory milestones can be designed.

| #   | Question                                                                | Current assumption                                       | Needed by   |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------- | ----------- |
| 1   | Is inventory organized by warehouse, location, or only by organization? | Organization-wide stock until a location model is chosen | Milestone 2 |
| 2   | Are items tracked individually (serial/lot) or only by quantity?        | Quantity only for the first slice                        | Milestone 2 |
| 3   | Can one item have multiple units and conversion factors?                | One base unit per item initially                         | Milestone 2 |
| 4   | Are stock levels derived from movements or maintained as a cache?       | Decide with the movement milestone                       | Milestone 3 |
| 5   | Are negative stock levels allowed?                                      | Refuse by default; make any override explicit            | Milestone 3 |
| 6   | Is multi-organization membership required for one user?                 | One user belongs to one organization                     | Future      |
| 7   | Should desktop work offline?                                            | No; offline and sync are out of scope                    | Future      |
| 8   | What is the reporting granularity for stock valuation?                  | Not decided                                              | Milestone 4 |
| 9   | Who may manage users after the foundation?                              | `ADMINISTRATOR` only for initial slices                  | Milestone 4 |
| 10  | Which locales beyond English and Spanish are required?                  | English and Spanish only                                 | Future      |

When a question is answered, record the decision in an ADR and update this table.
