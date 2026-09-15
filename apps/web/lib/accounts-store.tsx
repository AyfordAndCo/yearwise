'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { currentBalanceMinor } from '@yearwise/logic';
import type { AccountKind } from '@yearwise/logic';

export type { AccountKind };

export interface Account {
  id: string;
  name: string;
  type: AccountKind;
  /** Signed minor units. Negative means the account is overdrawn or owed on (A2). */
  openingBalanceMinor: bigint;
  /** A naive calendar date, `YYYY-MM-DD` (A6). */
  openingDate: string;
  includeInNetWorth: boolean;
  isArchived: boolean;
  /**
   * Stand-in for the ledger until FEAT-FIN-03 lands. Signed minor units.
   *
   * Balances are **derived** from this on read, never stored on the account -
   * there is no `balance` field here on purpose (I3).
   */
  transactionAmounts: readonly bigint[];
}

export interface AccountView extends Account {
  /** Derived: `openingBalanceMinor + SUM(transactionAmounts)`. */
  balanceMinor: bigint;
}

/** What the drawer submits. The store owns the id and the archived flag. */
export type AccountInput = Omit<Account, 'id' | 'isArchived' | 'transactionAmounts'>;

interface AccountsContextValue {
  accounts: AccountView[];
  createAccount: (input: AccountInput) => void;
  updateAccount: (id: string, input: AccountInput) => void;
  setArchived: (id: string, isArchived: boolean) => void;
}

const AccountsContext = createContext<AccountsContextValue | null>(null);

/**
 * Demo data.
 *
 * A credit card is opened already owed on, and the cheque account carries
 * transactions, so the derived balance is visibly not the opening balance.
 */
const SEED: Account[] = [
  {
    id: 'acc-current',
    name: 'Main Cheque Account',
    type: 'CURRENT',
    openingBalanceMinor: 1_248_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
    transactionAmounts: [-34_200n, -68_000n, 1_200_000n],
  },
  {
    id: 'acc-savings',
    name: 'Emergency Fund',
    type: 'SAVINGS',
    openingBalanceMinor: 820_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
    transactionAmounts: [],
  },
  {
    id: 'acc-card',
    name: 'Visa Platinum',
    type: 'CREDIT_CARD',
    openingBalanceMinor: -50_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
    transactionAmounts: [-120_000n],
  },
];

function toView(account: Account): AccountView {
  return {
    ...account,
    balanceMinor: currentBalanceMinor(account.openingBalanceMinor, account.transactionAmounts),
  };
}

/**
 * Accounts, in memory.
 *
 * TEMPORARY. Phase 1 reads accounts from Postgres through a route handler and
 * derives balances in SQL. This store exists so the screen is clickable and the
 * derivation rule is exercised end to end before the database is wired. The
 * components consume `AccountView`, which does not change when the source does.
 */
export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(SEED);

  const createAccount = useCallback((input: AccountInput) => {
    setAccounts((previous) => [
      ...previous,
      {
        ...input,
        id: `acc-${crypto.randomUUID()}`,
        isArchived: false,
        transactionAmounts: [],
      },
    ]);
  }, []);

  const updateAccount = useCallback((id: string, input: AccountInput) => {
    setAccounts((previous) =>
      previous.map((account) => (account.id === id ? { ...account, ...input } : account)),
    );
  }, []);

  // Archiving flips a flag and nothing else. Transactions are never touched
  // (I10), which is why this is safe to expose next to a destructive-looking
  // control.
  const setArchived = useCallback((id: string, isArchived: boolean) => {
    setAccounts((previous) =>
      previous.map((account) => (account.id === id ? { ...account, isArchived } : account)),
    );
  }, []);

  const value = useMemo<AccountsContextValue>(
    () => ({
      accounts: accounts.map(toView),
      createAccount,
      updateAccount,
      setArchived,
    }),
    [accounts, createAccount, updateAccount, setArchived],
  );

  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>;
}

export function useAccounts(): AccountsContextValue {
  const context = useContext(AccountsContext);
  if (context === null) {
    throw new Error('useAccounts must be used within an AccountsProvider');
  }
  return context;
}
