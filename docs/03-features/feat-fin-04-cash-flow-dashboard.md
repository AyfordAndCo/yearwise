# FEAT-FIN-04 - Cash-Flow Dashboard

| | |
|---|---|
| Module | Finance |
| Phase | 1 |
| Status | Draft |
| Depends on | FEAT-FIN-03 |
| Doc owner | |

## Problem

A ledger is evidence. It is not an answer. A user with 400 transactions still cannot say whether last month went well without adding them up, and adding them up is precisely the job they bought this product to stop doing. The dashboard is the screen that converts recording effort into insight, and it is the screen that determines whether the user comes back next month.

## User stories

- As a user, I want to know what I earned and spent this month, so that I know where I stand.
- As a user, I want to see which categories consume my money, so that I know what to change.
- As a user, I want to compare months, so that I can see a trend rather than a single number.
- As a user, I want to jump from a figure to the transactions behind it, so that I can verify it rather than trust it.

## Functional requirements

1. Show three primary figures for the selected period: income, expenses, net.
2. Show an expense breakdown by parent category as a donut chart, with a legend carrying amounts and percentages.
3. Show a 12-month income-versus-expense trend as a grouped bar chart.
4. Show a ranked list of the largest expense categories in the period.
5. Show the 5 most recent transactions in the workspace.
6. Provide a period selector with presets: this month, last month, this year, last 12 months, custom.
7. Clicking a category in the breakdown or ranked list navigates to the ledger with that category filter applied.
8. Clicking a month in the trend navigates to the ledger with that month's date range applied.
9. Remember the selected period for the session.

## Rules and calculations

### Period definition

Every period resolves to a half-open range `[startDate, endDate)` in the workspace's calendar-date space, consistent with FEAT-FIN-03.

| Preset | Range |
|---|---|
| This month | First day of the current calendar month to the first day of the next |
| Last month | First day of the previous month to the first day of the current month |
| This year | 1 January of the current year to 1 January of the next |
| Last 12 months | First day of the month 11 months ago to the first day of the next month |
| Custom | User-supplied inclusive dates, converted to `[from, to + 1 day)` at the boundary |

"Current" is resolved against the workspace's date settings, not the server clock.

### Aggregates

```
incomeMinor   = SUM(amountMinor) WHERE kind = INCOME
expensesMinor = ABS(SUM(amountMinor)) WHERE kind = EXPENSE
netMinor      = incomeMinor - expensesMinor
```

All three are computed over the selected period, across all non-archived accounts, including archived accounts if they hold transactions in the period. Archiving an account does not erase its history from reports.

### Savings rate

```
savingsRate = incomeMinor > 0 ? netMinor / incomeMinor : undefined
```

Rendered as a percentage to one decimal place. When `incomeMinor` is zero the UI displays an em dash, never `NaN`, `Infinity`, or `0%`. This is an explicit requirement because it is the most common dashboard defect in this category of product.

### Category breakdown

- Grouped by **parent** category by default. Children roll up into their parent.
- `Uncategorised` appears as an ordinary slice.
- Percentage is computed against `expensesMinor`, and percentages must sum to 100 within rounding tolerance. Rounding uses largest-remainder allocation, not independent rounding, so the legend does not display a total of 99.9%.
- Slices below 1% are aggregated into an "Other" slice, which remains clickable and filters to the constituent categories.

### Trend

- 12 consecutive months ending at the current month.
- Months with no transactions are **zero-filled**, not omitted. A missing month in a trend chart is a silent lie about the shape of the data.
- Each bar pair is `income` and `expenses` for that month.
- The zero-fill happens in the query, so the client never has to reconstruct a calendar.

### Query budget

The dashboard issues a **bounded number of queries, independent of the period length and the number of categories.**

| # | Query | Returns |
|---|---|---|
| 1 | Period totals | income, expenses, net |
| 2 | Expense breakdown by parent category | category id, name, colour, sum |
| 3 | 12-month trend, zero-filled | month, income, expenses |
| 4 | Ranked expense categories | top 5 by sum |
| 5 | Recent transactions | 5 rows |

Five queries, fixed. Aggregation happens in SQL. The client never downloads a transaction set and reduces it in JavaScript. At the stated ceiling of 10,000 transactions per user per year, a client-side reduce would be several hundred kilobytes per dashboard load, and it degrades linearly forever.

### Consistency

The dashboard and the ledger must use **the same period resolution and the same filter semantics**. If the dashboard says expenses were `4,120.00` for March, then filtering the ledger to March must produce exactly `4,120.00`. This is verified as an acceptance criterion, not assumed.

## Data model impact

No new tables. No schema change.

Requires the index `(workspaceId, categoryId, date)` from `data-model.md` for the breakdown, and `(workspaceId, date DESC, id DESC)` for the recent-transactions list.

## UI surfaces

**Dashboard screen.**

```
+---------------------------------------------------------------+
| Period selector:  [This month v]        [< Mar 2026 >]        |
+---------------------------------------------------------------+
|  Income            Expenses            Net        Savings rate |
|  24,543.54         20,972.00           3,571.54   14.6%        |
+---------------------------------------------------------------------------+
|                              |                                            |
|  Expense breakdown (donut)   |   12-month trend (grouped bars)            |
|                              |                                            |
+---------------------------------------------------------------------------+
| Top expense categories       |   Recent transactions                      |
| 1. Food          4,120.00    |   14 Mar  Groceries      -342.00           |
| 2. Housing       3,800.00    |   13 Mar  Salary      +12,000.00           |
+---------------------------------------------------------------------------+
```

**Period selector.** Presets in a dropdown, plus previous and next period arrows. Custom opens a date range picker. The selected period is reflected in a shareable URL query string.

**Chart interactions.** Hover shows a tooltip with the exact amount. Click drills through to the filtered ledger. Keyboard focus reaches every slice and bar, because a chart that cannot be read by keyboard is not accessible.

**States.**
- Empty workspace, no transactions at all: an onboarding prompt leading to the first transaction. Not a column of zeros.
- Period with no transactions: figures show `0.00`, and the charts are replaced by a clear "No activity in this period" message rather than an empty axis frame.
- Loading: skeletons matching the final layout, so nothing shifts on load.
- Error: a retry control, and the rest of the page still renders.

## Edge cases

- **Income is zero.** Savings rate shows an em dash. Do not divide.
- **Expenses are zero but income is not.** Donut is replaced by an empty state; net equals income; savings rate is 100%.
- **Net is negative.** Displayed as a negative figure with the expense treatment. No colour-only signalling.
- **A single category is 100% of expenses.** The donut renders one full ring, and the legend shows one row.
- **Archived category with historical transactions.** Included in the breakdown, suffixed "(archived)".
- **Archived account with historical transactions.** Included in every aggregate.
- **Future-dated transactions inside the period.** Included, because they are recorded facts. A future "exclude scheduled" toggle is a Phase 2 concern.
- **Very large values.** Formatting must not break the layout. Card figures shrink rather than wrap.
- **Period spanning a currency change.** Not possible. Invariant I12.
- **Custom range shorter than one day.** Rejected at the picker.

## Out of scope

- Budget versus actual (Phase 2, FEAT-FIN-07)
- Debt and savings panels (Phase 3)
- Net-worth over time
- Forecasting and projections
- Category-to-category comparison
- Customisable dashboard widgets and layout
- Exporting the dashboard as PDF (Phase 8)
- Any figure that requires a scheduled or recurring transaction (Phase 2)

## Acceptance criteria

- [ ] Dashboard income for March equals the ledger's income total with a March filter applied, to the minor unit.
- [ ] `0.01` recorded ten times in the period contributes exactly `0.10` to the expenses figure.
- [ ] The dashboard issues exactly 5 database queries regardless of period length or category count.
- [ ] A 12-month trend over a period with 3 inactive months renders 12 bars, with the inactive months at zero.
- [ ] Category percentages sum to exactly 100.0 when displayed, given a set of values chosen to trigger rounding failure under naive rounding.
- [ ] With zero income, the savings rate renders an em dash, and `NaN` or `Infinity` appears in no API response.
- [ ] Clicking the "Food" slice navigates to the ledger filtered to Food and all of its children, and the ledger total matches the slice value.
- [ ] A workspace with no transactions shows an onboarding prompt, not a zeroed dashboard.
- [ ] Every chart element is reachable and readable by keyboard alone.

## Open questions

- **Should the dashboard default to the current month or to a rolling 30 days?** Recommendation: the calendar month, because it aligns with budgets in Phase 2 and with how people think about pay cycles.
- **Should archived accounts be excludable from reports?** Currently included. If users find closed accounts distort history, add a toggle rather than changing the default.
- **How many months of trend history?** Currently 12. This becomes configurable when the dataset warrants it.