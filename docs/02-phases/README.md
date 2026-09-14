# Roadmap

Status values: `Done` | `In progress` | `Not started` | `Frozen`

| Phase | Name | Goal in one line | Depends on | Status |
|---|---|---|---|---|
| 0 | Foundations | Repo, monorepo, CI, auth shell, design tokens, deployed hello world | - | Not started |
| 1 | Financial Core | Accounts, categories, ledger, cash-flow dashboard | 0 | Not started |
| 2 | Budgeting and Automation | Recurring rules, budget lines, rollover vs zero-based | 1 | Not started |
| 3 | Debt and Savings | Snowball, avalanche, custom payoff; sinking funds; goals | 2 | Not started |
| 4 | Tasks and Projects | One-time and recurring tasks, priority distribution | 1 | Not started |
| 5 | Habits | Habit definitions, daily logs, streaks, annual grid | 1 | Not started |
| 6 | Unified Calendar | Tasks, schedules, habits and bills in one time view | 2, 4, 5 | Not started |
| 7 | Meals and Grocery | Weekly meal grid, auto-aggregated grocery list | 1 | Not started |
| 8 | Insight and Portability | Reports, export, bank CSV import, spreadsheet migration | 1, 2 | Not started |
| 9 | Mobile and Monetisation | Expo quick-entry app, billing, plans | 3-8 | Not started |

## Sequencing rules

- Phase 0 completes before any feature work begins. No exceptions.
- Phases 4, 5 and 7 are mutually independent and may be reordered by user demand.
- Phase 6 must follow 2, 4 and 5. It is purely an aggregation layer and has no data of its own.
- Phase 8's spreadsheet importer is the acquisition channel for existing users. It must not be deferred past public launch.
- A phase is not complete until its Definition of Done checklist is fully ticked. Partial completion does not advance the roadmap row.

## Explicit non-goals

Not planned, and listed here so they stop being raised:

- Bank API aggregation (Plaid or open banking). Revisit only if CSV import proves insufficient.
- Investment and portfolio tracking.
- Multi-currency with FX revaluation. See D5.
- Real-time collaborative editing.
- Tax filing or reporting.
- Debt payoff as a *tax* or legal advisor. Projection only.

## Phase documents

- `_template.md` - copy this to start a phase
- `phase-1-financial-core.md` - written
- Phases 0 and 2 through 9 - not yet written