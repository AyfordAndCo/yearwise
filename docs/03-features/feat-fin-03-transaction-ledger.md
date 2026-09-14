# FEAT-FIN-03 - Transaction Ledger

| | |
|---|---|
| Module | Finance |
| Phase | 1 |
| Status | Draft |
| Depends on | FEAT-FIN-01, FEAT-FIN-02 |
| Doc owner | |

**This is the critical path of Phase 1.** Every other financial feature reads from this table. A defect here is not a defect in one screen, it is a defect in every figure the product will ever display.

## Problem

Recording what you spent is the single most frequent action in the product and the one users abandon fastest. If it takes more than a few seconds, or if the number that comes back is ever wrong, the user leaves and does not return. The original spreadsheet fails here in two ways: entry is a grid on a phone, and a mistyped value corrupts every downstream tab silently.

## User stories

- As a user, I want to record an expense in a few seconds, so that I actually do it.
- As a user, I want to correct a mistake, so that the ledger stays trustworthy.
- As a user, I want to find a past transaction, so that I can check whether I already paid something.
- As a user, I want to filter by date, account and category, so that I can answer questions about a period.
- As a user, I want to see my balance update immediately after entry, so that I trust the app.

## Functional requirements

1. Create a transaction with: amount, kind, account, category, date, optional payee, optional notes.
2. Edit every one of those fields on an existing transaction.
3. Delete a transaction, with an undo affordance.
4. Duplicate a transaction, opening the create form pre-filled and dated today.
5. List transactions, newest first, grouped by date, with an infinite-scroll or paginated load.
6. Filter by: date range, one or more accounts, one or more categories including children, kind.
7. Search by payee or notes, case-insensitively.
8. Show a running total for the current filter: income, expenses and net.
9. Show the affected account balance after a create, edit or delete, without a full page reload.
10. Keyboard: `n` opens the create drawer, `Escape` closes it, `Cmd/Ctrl + Enter` saves.

## Rules and calculations

### Amount input and parsing

The user types a **positive magnitude**. Sign is not typed; it is derived from `kind`.

| Input | Parsed as | Note |
|---|---|---|
| `12.34` | `1234` | |
| `12` | `1200` | Integer minor units are zero-filled |
| `12.5` | `1250` | One decimal place is padded |
| `1,234.56` | `123456` | Thousands separators tolerated |
| ` 12.34 ` | `1234` | Whitespace trimmed |
| `12.345` | rejected | More precision than the currency allows |
| `-12.34` | rejected | Sign comes from `kind` |
| `abc` | rejected | |
| `` (empty) | rejected | |
| `0` | rejected | A zero-amount transaction is not a fact worth recording |

Parsing lives in `parseMoney` in `packages/logic`. It never uses `parseFloat`.

**Precision.** The number of decimal places is a property of the currency: 2 for most, 3 for `KWD`, `BHD`, `JOD`. Reject over-precision; never round silently. Rounding is a Phase 8 import concern, where it rounds half away from zero and is reported to the user.

**Range.** Reject magnitudes above 10^15 minor units. That is a typo guard, not a business rule.

### Sign derivation

```
kind = INCOME   -> amountMinor =  positive magnitude
kind = EXPENSE  -> amountMinor = -positive magnitude
```

Invariant I7 makes this a database constraint, not a convention. A row that violates it cannot exist.

### Kind and category consistency

`kind = INCOME` requires a category of type `INCOME`. `kind = EXPENSE` requires a category of type `EXPENSE`. Invariant I8. The picker filters by kind, and the API rejects mismatches even if the UI is bypassed.

### Date handling

- The date field is a calendar date. No time, no timezone. Invariant I13.
- Default is today in the workspace's locale, computed from the workspace's date settings, not from the server's clock.
- Future dates are permitted. A user may record a scheduled payment early.
- Dates before an account's `openingDate` are permitted, with an advisory.
- Grouping in the list is by the date string, not by a parsed instant.

### Filtering semantics

**The date range is half-open: `fromDate` inclusive, `toDate` exclusive.**

This is the single most common source of off-by-one bugs in this product. Writing `BETWEEN` or `<=` on the upper bound silently includes the first moment of the next day. Every range in the application, not only this feature, uses `[from, to)`.

A UI range of "1 March to 31 March" is transmitted as `fromDate = 2026-03-01`, `toDate = 2026-04-01`.

**Category filter includes descendants.** Selecting the parent `Food` matches transactions on `Food` and on every child of `Food`. Selecting a child matches only that child. Implemented as an `IN` over the resolved id set, not as a recursive query per row.

### Totals

```
incomeMinor   = SUM(amountMinor) WHERE kind = INCOME
expensesMinor = ABS(SUM(amountMinor)) WHERE kind = EXPENSE
netMinor      = incomeMinor - expensesMinor
              = SUM(amountMinor) across all kinds
```

Totals are computed over the **entire filtered set**, not the currently loaded page. A total that changes as the user scrolls is worse than no total.

### Pagination

**Keyset pagination. `OFFSET` is prohibited.**

- Order by `(date DESC, id DESC)`.
- Cursor is an opaque base64 encoding of `(date, id)`.
- Next page: `WHERE (date, id) < (cursor.date, cursor.id)` using row-value comparison.
- Page size 50, fixed.

`OFFSET` is prohibited because it degrades linearly and, worse, silently skips or duplicates rows when a transaction is inserted while the user scrolls. The index `(workspaceId, date DESC, id DESC)` exists precisely for this query.

### Balance propagation

After any mutation, the affected account balances are recomputed and pushed to the client in the response. The client does not guess. Two accounts are affected when an edit changes the account.

### Idempotency

Every create request carries a client-generated idempotency key. The server stores it with the transaction and returns the existing row on a repeat. This is what makes a double-clicked save button harmless rather than duplicative.

## Data model impact

Creates `Transaction`. Fields and indexes as specified in `docs/01-architecture/data-model.md` section 3.6.

Adds an `idempotencyKey` unique column, scoped to the workspace.

Invariants enforced here: I1, I3, I7, I8, I9 (Phase 2), I13.

## UI surfaces

**Ledger screen.** Table with date group headers. Columns: date, payee or notes, category, account, amount. Amount is right-aligned, monospaced, and negative values carry the expense treatment in the design system. Clicking a row opens the edit drawer.

**Filters bar.** Date range with quick presets (this month, last month, this year, custom), account multi-select, category multi-select, kind segmented control, text search. Active filters render as removable chips. A "clear all" control appears when any filter is active.

**Totals strip.** Income, expenses and net for the current filter. Always visible, including when the list is empty.

**Add/edit drawer.** Slide-over from the right on desktop, bottom sheet on mobile. Fields in this order: amount (autofocused), kind, account, category, date, payee, notes. Tab order follows the visual order. Amount is a large, prominent input - it is the reason the user is here.

**Row actions.** Edit, duplicate, delete. Delete shows an undo toast for 10 seconds before the row is actually removed, and the removal is deferred until the toast expires.

**States.** Empty with no transactions - onboarding prompt. Empty with filters active - "no transactions match" plus a clear-filters control. These are different states and must look different. Loading - skeleton rows. Error - retry.

## Edge cases

- **Editing the amount.** Balance updates by the delta on the same account.
- **Editing the account.** The old account balance decreases by the amount; the new account balance increases by it. Both are returned.
- **Editing the date across a period boundary.** Totals for both periods change. Both are within the same month-scoped summary response.
- **Deleting a transaction that is the target of an open undo toast.** Not possible; the toast owns the row until it expires.
- **Double-clicking save.** Idempotency key makes the second request a no-op returning the first row.
- **Two browser tabs open.** Tab A does not see tab B's insert until refresh. Acceptable in Phase 1; a real-time channel is Phase 9.
- **A very long note.** Truncated in the list with a tooltip; full text in the drawer. Cap at 2,000 characters on write.
- **A transaction on an archived account.** Permitted to view and edit. The account shows "(archived)".
- **A transaction on an archived category.** Permitted to view and edit. The category shows "(archived)".
- **Concurrent edit of the same row in two tabs.** Last write wins in Phase 1, and this is documented rather than defended against.
- **Currency with three decimal places.** Input accepts three decimal places and `formatMoney` renders three.
- **A user with more than 10,000 transactions in a year.** Pagination and indexes keep this fast. This is the stated capacity ceiling and must be tested against, not assumed.

## Out of scope

- Transfers between accounts (Phase 2)
- Split transactions across categories (not planned)
- Attachments and receipt images
- Bank statement import (Phase 8)
- Recurring rules generating transactions (Phase 2)
- Bulk edit and bulk delete
- Saved filter views
- Multi-row selection
- Tags independent of categories
- Multi-currency transactions

## Acceptance criteria

- [ ] `parseMoney('12.34')` returns exactly `1234n`, and `parseMoney` never calls `parseFloat`.
- [ ] Entering `0.01` ten times produces a filter total of exactly `0.10`, not `0.09999999999999999`.
- [ ] Saving an expense of `25.00` on a `1,000.00` account shows `975.00` without a page reload.
- [ ] Deleting that transaction shows `1,000.00`.
- [ ] Changing that transaction's account to a second account moves `25.00` from the first to the second.
- [ ] A date filter of `2026-03-01` to `2026-03-31` includes every transaction on 31 March and none on 1 April.
- [ ] A filter on parent category `Food` includes transactions categorised under its children.
- [ ] Scrolling to page 3 and inserting a new transaction at the top does not cause a row to be skipped or duplicated.
- [ ] The totals strip shows the same figure regardless of how many pages have been loaded.
- [ ] Posting the same idempotency key twice creates exactly one row.
- [ ] With 10,000 transactions in a workspace, opening the ledger returns the first page in under 300 ms against a production-sized dataset.
- [ ] `git grep -n "parseFloat\|toFixed"` inside money-handling code returns nothing.

## Open questions

- **Undo semantics.** A 10-second client-side undo delay means the row still exists on the server after the user thinks it is gone. Is a soft delete with `deletedAt` preferable? Recommendation: keep hard delete plus optimistic UI, and issue the delete only when the toast expires. Revisit if users report confusion.
- **Zero-amount transactions.** Currently rejected. Some users create a zero row as a placeholder or a memo. Recommendation: keep the rejection in Phase 1 and reconsider if it is reported.
- **Payee as free text versus a separate entity.** Free text now; a `Payee` table becomes worthwhile when import and auto-categorisation arrive in Phase 8.