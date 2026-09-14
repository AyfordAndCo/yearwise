# FEAT-FIN-01 - Accounts

| | |
|---|---|
| Module | Finance |
| Phase | 1 |
| Status | Draft |
| Depends on | FEAT-ACC-01 |
| Doc owner | |

## Problem

A user's money sits in several places: a current account, a savings account, one or more credit cards, cash, maybe a loan. Without accounts, a transaction has no container, balances cannot be computed, and the ledger has no meaning. Every other financial feature depends on this table existing and being correct.

## User stories

- As a user, I want to add each place my money sits, so that I can see where it actually is.
- As a user, I want to record what an account held before I started using the app, so that my balances are correct from day one.
- As a user, I want to close an account without losing its history, so that my past records stay intact.
- As a user, I want to see my overall position across all accounts, so that I know where I stand.

## Functional requirements

1. The user can create an account with a name, type, opening balance, opening date and a net-worth inclusion flag.
2. The user can edit an account's name, type, opening balance, opening date and inclusion flag, at any time.
3. The user can archive an account. Archiving never deletes or modifies transactions.
4. The user can reorder accounts for display.
5. The accounts screen lists every account with its derived current balance, grouped by type.
6. The user can filter the ledger to one account by clicking it.
7. A single figure shows the total position across all accounts included in net worth.

## Rules and calculations

**Account types and their display behaviour**

| Type | Display sign | Counts in net worth |
|---|---|---|
| `CHECKING` | as stored | yes |
| `SAVINGS` | as stored | yes |
| `CASH` | as stored | yes |
| `CREDIT_CARD` | flipped - shows amount owed as positive | yes, contributing negatively |
| `LOAN` | flipped - shows amount owed as positive | yes, contributing negatively |

**Current balance.** Derived, never stored.

```
currentBalanceMinor(account) =
    account.openingBalanceMinor
  + SUM(t.amountMinor)
      WHERE t.accountId = account.id
```

**Net worth.**

```
netWorthMinor =
  SUM(account.openingBalanceMinor + SUM(t.amountMinor))
      for every account WHERE includeInNetWorth AND NOT isArchived
```

Because debt balances are negative by the sign convention, net worth is a plain sum. No special-casing of debt types in the arithmetic - only in the display.

**Display.** `displayMinor = type IN (CREDIT_CARD, LOAN) ? -currentBalanceMinor : currentBalanceMinor`. Formatting goes through `formatMoney` in `packages/logic`.

**Query shape.** A list of accounts must not issue one aggregate query per account. Use a single grouped aggregate joined to the account list. This is a stated requirement, not an optimisation to be discovered later.

**Opening balance.** May be negative. A credit card the user already owes on should be created with a negative opening balance.

**Opening date.** Defaults to today. Transactions dated before it are permitted, because a user entering history backwards should not be blocked. The accounts screen shows an advisory, not an error.

## Data model impact

Creates `Account`. Fields as specified in `docs/01-architecture/data-model.md` section 3.4.

No new invariants. Existing invariants that bind here:

- **I2** - all accounts in a workspace share the workspace currency.
- **I3** - there is no `balance` column, and no code path may write one.
- **I10** - archiving never mutates transactions.
- **I12** - the workspace currency cannot change once a transaction exists.

## UI surfaces

**Accounts screen.** Grouped list by type. Each row: name, type badge, derived balance, an archived indicator. Row actions: edit, archive, view transactions. A single net-worth figure at the top, with the excluded-account count noted if non-zero.

**Add and edit drawer.** Fields: name, type, opening balance, opening date, include in net worth. Inline validation. Save and cancel.

**States.** Empty - a prompt to create the first account. Loading - skeleton rows. Error - retry affordance. Populated - as above.

**Ledger filter.** Clicking an account filters the transaction ledger by it.

## Edge cases

- **Negative opening balance on a checking account.** Permitted. An overdrawn account is real.
- **Opening balance of zero.** Permitted and common.
- **Archiving an account with a non-zero balance.** Permitted, with a warning that the balance will be excluded from the default net-worth figure. Not blocked - users close accounts with residual balances.
- **Archiving the only account.** Permitted. The accounts screen shows an empty state and a link to create one.
- **Renaming an account.** Historical transactions display the current name. There is no requirement to preserve the old name.
- **Changing an account's type.** Permitted, and it changes the display sign and net-worth treatment. Acceptable because the underlying stored value is unchanged.
- **Deleting an account.** Not offered. Archive is the only path. This is deliberate: it makes referential integrity a non-issue.
- **Two accounts with the same name.** Permitted. Names are not unique.
- **Archived accounts in pickers.** Shown greyed with an "(archived)" suffix when editing a historical transaction, never offered for a new one.

## Out of scope

- Transfers between accounts (Phase 2, FEAT-FIN-10)
- Account reconciliation or statement matching
- Bank feeds, open banking or any network integration
- Per-account currency
- Credit limit tracking and utilisation percentage
- Interest accrual on savings accounts
- Attachments: statements, contracts, receipts

## Acceptance criteria

- [ ] Creating an account with an opening balance of `1,000.00` immediately shows a balance of `1,000.00`.
- [ ] Adding an expense of `25.00` to that account shows a balance of `975.00`.
- [ ] Deleting that transaction returns the balance to exactly `1,000.00`.
- [ ] A credit card with an opening balance of `-500.00` displays `500.00 owed` and reduces net worth by `500.00`.
- [ ] A checking account at `1,000.00` plus a credit card at `-500.00` yields a net worth of `500.00`.
- [ ] Archiving an account removes it from the net-worth total and leaves every one of its transactions intact and visible in the ledger.
- [ ] Listing 20 accounts issues a bounded number of database queries, independent of the account count.
- [ ] No API response or database column contains a stored balance.

## Open questions

- Should the account list show a sparkline of balance over time? Deferred, likely valuable.
- Should `includeInNetWorth` default to true for every type, including loans? Assumed yes.