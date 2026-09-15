/**
 * Account balances.
 *
 * Everything here is **derived** (I3): `openingBalanceMinor + SUM(transactions)`.
 * There is no `balance` column anywhere in the schema, and no code path may
 * write one. These are pure functions - no I/O, no clock, no framework.
 *
 * See docs/03-features/feat-fin-01-accounts.md and glossary section 3.
 */

import { sumMinor } from './money';

export type AccountKind = 'CURRENT' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'LOAN';

/**
 * The stored balance. Never the number shown to the user - that is
 * `displayBalanceMinor`, which flips debt.
 */
export function currentBalanceMinor(
  openingBalanceMinor: bigint,
  transactionAmounts: readonly bigint[],
): bigint {
  return openingBalanceMinor + sumMinor(transactionAmounts);
}

/**
 * Debt account types display their balance flipped.
 *
 * A credit card you owe on is stored **negative** by the sign convention (A2),
 * so it is shown as a positive "owed" figure rather than "-1,200". Display
 * concern only: the stored value never changes.
 */
export function isDebtAccount(type: AccountKind): boolean {
  return type === 'CREDIT_CARD' || type === 'LOAN';
}

export function displayBalanceMinor(balanceMinor: bigint, type: AccountKind): bigint {
  return isDebtAccount(type) ? -balanceMinor : balanceMinor;
}

/**
 * The stored opening balance, from the magnitude a user typed.
 *
 * A debt account is described to the user as an **amount owed** - a positive
 * magnitude - and must be stored negative, so that the sign convention (A2) and
 * the display flip agree: type `500`, store `-500`, read `500.00 owed`.
 *
 * An asset account is stored exactly as typed, so an overdrawn current account
 * can be opened at a negative balance (FEAT-FIN-01).
 */
export function openingBalanceMinorFromInput(
  magnitudeMinor: bigint,
  type: AccountKind,
): bigint {
  return isDebtAccount(type) ? -magnitudeMinor : magnitudeMinor;
}

export interface NetWorthEntry {
  /** The **stored** balance, not the display balance. */
  balanceMinor: bigint;
  includeInNetWorth: boolean;
  isArchived: boolean;
}

/**
 * Net worth is a plain sum.
 *
 * Debt is already negative by the sign convention, so there is no special case
 * for debt types in the arithmetic - only in the display. Archived accounts and
 * those opted out are excluded.
 */
export function netWorthMinor(entries: readonly NetWorthEntry[]): bigint {
  let total = 0n;
  for (const entry of entries) {
    if (!entry.includeInNetWorth || entry.isArchived) continue;
    total += entry.balanceMinor;
  }
  return total;
}

/** How many accounts are excluded from net worth, so the UI can say so. */
export function excludedFromNetWorthCount(entries: readonly NetWorthEntry[]): number {
  let count = 0;
  for (const entry of entries) {
    if (!entry.includeInNetWorth || entry.isArchived) count += 1;
  }
  return count;
}

/** Display order for account groups: assets first, then cash, then debt. */
export const ACCOUNT_KIND_ORDER: readonly AccountKind[] = [
  'CURRENT',
  'SAVINGS',
  'CASH',
  'CREDIT_CARD',
  'LOAN',
];
