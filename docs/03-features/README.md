# Feature Registry

Every feature the product will contain, one row each. A phase document selects feature IDs from this table. A feature ID that is not here does not get built.

ID format: `FEAT-<MODULE>-<NN>`.
Modules: `ACC` account, `UX` experience, `FIN` finance, `PRD` productivity, `LIF` lifestyle, `CAL` calendar, `DAT` data, `PLT` platform.

Status values: `Not written` | `Draft` | `Review` | `Approved` | `In build` | `Shipped` | `Frozen`.
A feature may not enter `In build` until its document status is `Approved`.

## Account

| ID | Feature | Phase | Doc | Status |
|---|---|---|---|---|
| FEAT-ACC-01 | Authentication and tenancy | 0 | - | Not written |
| FEAT-ACC-02 | Workspace settings | 0 | - | Not written |

## Experience

| ID | Feature | Phase | Doc | Status |
|---|---|---|---|---|
| FEAT-UX-01 | Setup wizard and onboarding | 0 | - | Not written |
| FEAT-UX-02 | Notifications and budget alerts | 2 | - | Not written |

## Finance

| ID | Feature | Phase | Doc | Status |
|---|---|---|---|---|
| FEAT-FIN-01 | Accounts | 1 | [feat-fin-01-accounts.md](./feat-fin-01-accounts.md) | Draft |
| FEAT-FIN-02 | Categories | 1 | [feat-fin-02-categories.md](./feat-fin-02-categories.md) | Draft |
| FEAT-FIN-03 | Transaction ledger | 1 | [feat-fin-03-transaction-ledger.md](./feat-fin-03-transaction-ledger.md) | Draft |
| FEAT-FIN-04 | Cash-flow dashboard | 1 | [feat-fin-04-cash-flow-dashboard.md](./feat-fin-04-cash-flow-dashboard.md) | Draft |
| FEAT-FIN-05 | Recurring rules engine | 2 | - | Not written |
| FEAT-FIN-06 | Budget lines and strategies | 2 | - | Not written |
| FEAT-FIN-07 | Budget versus actual reporting | 2 | - | Not written |
| FEAT-FIN-08 | Debt payoff engine | 3 | - | Not written |
| FEAT-FIN-09 | Savings goals and sinking funds | 3 | - | Not written |
| FEAT-FIN-10 | Transfers between accounts | 2 | - | Not written |
| FEAT-FIN-11 | Financial calendar | 6 | - | Not written |

## Productivity

| ID | Feature | Phase | Doc | Status |
|---|---|---|---|---|
| FEAT-PRD-01 | One-time tasks | 4 | - | Not written |
| FEAT-PRD-02 | Recurring tasks | 4 | - | Not written |
| FEAT-PRD-03 | Task dashboard and priority distribution | 4 | - | Not written |
| FEAT-PRD-04 | Projects | 4 | - | Not written |

## Lifestyle

| ID | Feature | Phase | Doc | Status |
|---|---|---|---|---|
| FEAT-LIF-01 | Habit definitions and daily logging | 5 | - | Not written |
| FEAT-LIF-02 | Habit analytics: completion and streaks | 5 | - | Not written |
| FEAT-LIF-03 | Meal planner | 7 | - | Not written |
| FEAT-LIF-04 | Grocery list generator | 7 | - | Not written |

## Calendar

| ID | Feature | Phase | Doc | Status |
|---|---|---|---|---|
| FEAT-CAL-01 | Unified calendar | 6 | - | Not written |
| FEAT-CAL-02 | Overload detection | 6 | - | Not written |

## Data

| ID | Feature | Phase | Doc | Status |
|---|---|---|---|---|
| FEAT-DAT-01 | Bank CSV import | 8 | - | Not written |
| FEAT-DAT-02 | Spreadsheet migration | 8 | - | Not written |
| FEAT-DAT-03 | Export and reports | 8 | - | Not written |

## Platform

| ID | Feature | Phase | Doc | Status |
|---|---|---|---|---|
| FEAT-PLT-01 | Billing and plans | 9 | - | Not written |
| FEAT-PLT-02 | Mobile quick entry | 9 | - | Not written |

## Rules

1. One feature, one document. If it needs two documents, it is two features.
2. Every feature has explicit acceptance criteria. A feature without testable acceptance criteria is not approved.
3. The `Rules and calculations` section is the reason the document exists. It is where the arithmetic, ordering, rounding and edge behaviour is written down. Prose is not acceptable there.
4. A feature is `Shipped` only when its acceptance criteria pass in the deployed environment.