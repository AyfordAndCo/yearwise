# Phase 1 - Financial Core

Status: Draft
Depends on: Phase 0
Target: 4 weeks solo, 2 weeks paired

## Goal

A signed-in user can record what they earn and spend across multiple accounts, categorise it, and see a dashboard they trust - with no spreadsheet, no formulas and no manual reconciliation. Everything downstream (budgets, debts, tasks, habits) is built on the ledger this phase produces, so correctness here matters far more than polish.

## In scope

| ID | Feature | Notes |
|---|---|---|
| FEAT-ACC-01 | Authentication and tenancy | Email and password, or magic link. Workspace auto-created at signup. |
| FEAT-ACC-02 | Settings | Currency, week start, date format, locale. |
| FEAT-UX-01 | Setup wizard | Guided first run: currency, first account, starter categories. Replaces the spreadsheet's video walkthrough. |
| FEAT-FIN-01 | Accounts | Create, edit, archive. Opening balance. |
| FEAT-FIN-02 | Categories | Two-level tree, seeded starter set, user editable. |
| FEAT-FIN-03 | Transaction ledger | Create, edit, delete. List with filters, search, keyset pagination. |
| FEAT-FIN-04 | Cash-flow dashboard | Income, expenses, net, category breakdown, trend over time. |

## Out of scope

Refused explicitly, even though each will feel one small step away:

- Recurring rules (Phase 2), including the "Paid" checkbox behaviour
- Budgets and any budget-versus-actual view
- Transfers between accounts
- Debt, savings and goals
- Tasks, habits, meals and calendar
- CSV import, bank sync, export
- Notifications of any kind
- Mobile app
- Billing and plans

If it is not in the in-scope table above, it is not in this phase.

## Deliverables

- [ ] Staging deployment, updated on merge to `main`
- [x] Schema and migrations for the Phase 1 tables in `docs/01-architecture/data-model.md` - applied to Supabase, with I7, I9 and `citext` added by hand
- [ ] RLS policies on every table, with a test proving user A cannot read user B's rows. **Not written.** Every table carries `workspaceId`, and the API is single-tenant by construction until auth lands.
- [x] `packages/logic`: `money.ts` (`parseMoney`, `formatMoney`, `sumMinor`), `date.ts` (calendar-date helpers), `category-tree.ts` (`buildCategoryRows`, `resolveCategoryIds`, `childIds`)
- [x] `packages/ui`: design tokens for the light and green brand (D7), plus `Button`, `Input`, `MoneyText`, `Drawer`, `Table`, `ChartFrame`. `Select`, `EmptyState` and `Toast` still to build.
- [ ] Six screens: Dashboard, Transactions, Accounts, Categories, Settings, Setup wizard. **Routes exist for five; Accounts is built, the rest are placeholders. Setup wizard awaits auth.**
- [ ] Seed script: default categories, plus a demo workspace for development
- [ ] `docs/03-features/feat-fin-03-transaction-ledger.md` written and approved **before** its implementation begins

## Build order

Vertical slices. Each step ends with something a human can click. Never build a whole backend and then a whole frontend.

1. **Auth and workspace.** Sign up, land on an empty dashboard, sign out, sign in.
2. **Accounts.** Create two accounts with opening balances. Balances display correctly and are derived.
3. **Categories.** The seeded tree renders. The user adds a child category. A parent can be archived.
4. **Transactions.** Add an expense through a slide-over drawer. It appears in the list. The account balance changes. *This is the core slice.*
5. **Transaction editing.** Edit amount, date and category. Delete. Verify the balance recovers exactly.
6. **Filters and search.** Date range, account, category, text. Keyset pagination.
7. **Dashboard.** Totals, donut chart, bar chart, all computed from the same queries the list uses.
8. **Setup wizard and empty states.** Every screen has a designed empty state. The wizard can be re-run.
9. **Hardening.** See Definition of Done.

## Technical dependencies

- Phase 0 outputs: monorepo, CI, staging deploy, environment management, `packages/database`
- Library choices deferred to `tech-stack.md`. The only firm constraints are `BigInt`-safe money handling end to end, and a charting library that renders without a layout flash
- No new external services in this phase. No bank aggregation, no queue, no cache

## Definition of Done

- [ ] Every in-scope feature meets the acceptance criteria in its feature document
- [ ] Migrations apply cleanly to an empty database **and** roll back
- [ ] RLS verified by automated test, not by inspection
- [ ] Balances verified by a property test: after a randomised sequence of create, edit and delete operations, `openingBalance + sum(transactions)` equals the displayed balance
- [ ] Money round-trips through the API without precision loss, proven by a test that posts `"0.01"` ten times and asserts `"0.10"`
- [ ] Dashboard aggregates match a hand-computed fixture
- [ ] No `number`-typed money variables anywhere, enforced by a lint rule
- [ ] Every screen has empty, loading and error states
- [ ] Documentation updated: this phase, feature statuses, decision log
- [ ] A person who has never seen the app can sign up and record a transaction in under two minutes, unassisted

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Money precision bugs found late | Medium | Critical - permanently destroys trust | Invariants I2, I7, I8 plus property tests before any UI polish |
| Category tree complexity bleeding past Phase 1 | High | Medium | Depth hard-capped at 2. No reordering UI. No drag and drop. |
| Scope creep into recurring rules ("just a toggle") | Very high | High | Recurrence is a rule entity plus a scheduler. It is Phase 2 in full. |
| Charting library fights the design system | Medium | Low | Wrap it once. Never theme it per screen. |
| RLS misconfiguration silently leaking data | Low | Critical | Automated cross-tenant test in CI on every pull request |

## Acceptance criteria

1. A new user signs up, sets a currency, creates one account and records one expense in under two minutes without help.
2. The dashboard's income, expense and net figures equal a hand-computed sum of the visible ledger for the selected period.
3. Editing a transaction's amount updates the account balance and every affected chart without a full page reload.
4. Filtering by date range, then by category, then clearing filters returns to the identical unfiltered state.
5. A second user in a second workspace cannot see, or infer the existence of, the first workspace's rows.
6. Entering `0.01` ten times sums to exactly `0.10`.

## Notes and open questions

- **Starter category seed.** Ship roughly 12 parents and 40 children, mirroring the original's subcategory list. Needs a decision on whether the seed is locale-aware. Deferred to the feature document, but flagged here. See decision O7.
- **Opening balance date.** If a user imports historical data later, `openingDate` becomes meaningful. Keep it a real field from day one.
- **Entry form versus grid.** The original is a spreadsheet grid. Decide explicitly. A slide-over form for entry plus a table view for review is the recommendation, because the grid is precisely why the original is unusable on a phone.