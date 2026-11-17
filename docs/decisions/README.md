# Architecture decision records

> Foundation ADRs are listed below. Product and technical decisions that are not
> foundation architecture are recorded in
> [TECHNICAL_DECISIONS.md](../project/TECHNICAL_DECISIONS.md). When a decision
> changes the architecture, add an ADR here as well.

ADRs retained for the Inventory U3 foundation:

| ADR  | Decision                                                            |
| ---- | ------------------------------------------------------------------- |
| 0001 | pnpm + Turborepo monorepo                                           |
| 0002 | Tauri 2 for desktop                                                 |
| 0004 | Framework-independent domain                                        |
| 0005 | REST over HTTP with Fastify                                         |
| 0006 | Feature-oriented frontend, one component library                    |
| 0007 | TanStack Query for server state, Zustand for local state            |
| 0008 | One React app package with thin shells                              |
| 0009 | Platform abstraction                                                |
| 0010 | Tailwind v4 + shadcn/ui + token layer                               |
| 0013 | Shells declare a target; the app owns the rest                      |
| 0019 | Keep the last desktop build that worked                             |
| 0025 | Two engines: SQLite runs the product, PostgreSQL is kept            |
| 0028 | Authentication is opaque bearer sessions, hashed at rest            |
| 0029 | Login attempts are limited in process                               |
| 0030 | Development login-as is gated by route existence                    |
| 0032 | UI language is a typed catalogue, Spanish by default                |
| 0038 | Inventory U3 starts from a generic organization/session foundation  |
| 0039 | Branch-scoped persistence                                           |
| 0040 | Stock movements are append-only; corrections reference the original |
| 0041 | Stock balances derive from the append-only ledger                   |
| 0042 | Production snapshots drive the stock ledger                         |
| 0043 | Sales checkpoints snapshot weight and price before posting ledger   |
| 0044 | Daily closings snapshot the day and reopen as a new version         |
| 0045 | Reports are computed on demand from source records                  |

Numbering gaps are intentional: dental-specific decisions were removed with the
business domain rather than rewritten as if they had been made for this product.
