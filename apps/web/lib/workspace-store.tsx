'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { currentBalanceMinor, signedAmountMinor } from '@yearwise/logic';
import type { AccountKind, IsoDate, LedgerEntry, TransactionKind } from '@yearwise/logic';

export type { AccountKind, IsoDate, LedgerEntry, TransactionKind };

export interface Account {
  id: string;
  name: string;
  type: AccountKind;
  /** Signed minor units. Negative means overdrawn or owed on (A2). */
  openingBalanceMinor: bigint;
  /** A naive calendar date, `YYYY-MM-DD` (A6). */
  openingDate: IsoDate;
  includeInNetWorth: boolean;
  isArchived: boolean;
}

export interface AccountView extends Account {
  /** Derived from the ledger, never stored (I3). */
  balanceMinor: bigint;
  transactionAmounts: readonly bigint[];
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  type: 'INCOME' | 'EXPENSE';
  isArchived: boolean;
}

/** What the account drawer submits. The store owns the id and the archived flag. */
export type AccountInput = Omit<Account, 'id' | 'isArchived'>;

export interface TransactionInput {
  accountId: string;
  categoryId: string;
  /** A positive magnitude. The sign comes from `kind`, never from the user (I7). */
  magnitudeMinor: bigint;
  kind: TransactionKind;
  date: IsoDate;
  payee?: string | null;
  notes?: string | null;
  /**
   * Client-generated. A repeat of the same key is ignored, which is what makes
   * a double-clicked save harmless rather than duplicative (FEAT-FIN-03).
   */
  idempotencyKey: string;
}

interface WorkspaceContextValue {
  accounts: AccountView[];
  transactions: LedgerEntry[];
  categories: Category[];
  createAccount: (input: AccountInput) => void;
  updateAccount: (id: string, input: AccountInput) => void;
  setArchived: (id: string, isArchived: boolean) => void;
  createTransaction: (input: TransactionInput) => void;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Demo data, shaped so the derived balance is visibly not the opening balance:
 * the cheque account carries three transactions, and the card is opened already
 * owed on and then spent against.
 */
const SEED_ACCOUNTS: Account[] = [
  {
    id: 'acc-current',
    name: 'Main Cheque Account',
    type: 'CURRENT',
    openingBalanceMinor: 1_248_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
  },
  {
    id: 'acc-savings',
    name: 'Emergency Fund',
    type: 'SAVINGS',
    openingBalanceMinor: 820_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
  },
  {
    id: 'acc-card',
    name: 'Visa Platinum',
    type: 'CREDIT_CARD',
    openingBalanceMinor: -50_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
  },
];

/**
 * A starter tree, standing in for the FEAT-FIN-02 seed. Two levels, one
 * `Uncategorised` per type, because a transaction can never be saved without a
 * category and the fallback is always available.
 */
const SEED_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food', parentId: null, type: 'EXPENSE', isArchived: false },
  { id: 'cat-groceries', name: 'Groceries', parentId: 'cat-food', type: 'EXPENSE', isArchived: false },
  { id: 'cat-restaurants', name: 'Restaurants', parentId: 'cat-food', type: 'EXPENSE', isArchived: false },
  { id: 'cat-transport', name: 'Transport', parentId: null, type: 'EXPENSE', isArchived: false },
  { id: 'cat-fuel', name: 'Fuel', parentId: 'cat-transport', type: 'EXPENSE', isArchived: false },
  { id: 'cat-housing', name: 'Housing', parentId: null, type: 'EXPENSE', isArchived: false },
  { id: 'cat-rent', name: 'Rent', parentId: 'cat-housing', type: 'EXPENSE', isArchived: false },
  { id: 'cat-income', name: 'Salary', parentId: null, type: 'INCOME', isArchived: false },
  { id: 'cat-salary', name: 'Main salary', parentId: 'cat-income', type: 'INCOME', isArchived: false },
  { id: 'cat-uncategorised-expense', name: 'Uncategorised', parentId: null, type: 'EXPENSE', isArchived: false },
  { id: 'cat-uncategorised-income', name: 'Uncategorised', parentId: null, type: 'INCOME', isArchived: false },
];

const SEED_TRANSACTIONS: LedgerEntry[] = [
  {
    id: 'tx-1',
    accountId: 'acc-current',
    categoryId: 'cat-groceries',
    amountMinor: -34_200n,
    kind: 'EXPENSE',
    status: 'POSTED',
    date: '2026-03-14',
    payee: 'Woolworths',
    notes: 'Weekly shop',
  },
  {
    id: 'tx-2',
    accountId: 'acc-current',
    categoryId: 'cat-fuel',
    amountMinor: -68_000n,
    kind: 'EXPENSE',
    status: 'POSTED',
    date: '2026-03-14',
    payee: 'Engen',
    notes: null,
  },
  {
    id: 'tx-3',
    accountId: 'acc-current',
    categoryId: 'cat-salary',
    amountMinor: 1_200_000n,
    kind: 'INCOME',
    status: 'POSTED',
    date: '2026-03-13',
    payee: 'Ayford & Co',
    notes: 'March salary',
  },
  {
    id: 'tx-4',
    accountId: 'acc-card',
    categoryId: 'cat-restaurants',
    amountMinor: -120_000n,
    kind: 'EXPENSE',
    status: 'POSTED',
    date: '2026-03-12',
    payee: 'Nandos',
    notes: null,
  },
];

/**
 * The workspace, in memory.
 *
 * TEMPORARY. Phase 1 reads this from Postgres and derives every balance in SQL.
 * It exists so the screens are clickable and the derivation rules are exercised
 * end to end before the database is wired. Components consume `AccountView` and
 * `LedgerEntry`, neither of which changes when the source does.
 *
 * The ledger is the single source of truth for money movement: an account's
 * balance is derived from its transactions, so recording an expense on the
 * ledger moves the account balance on the accounts screen.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(SEED_ACCOUNTS);
  const [transactions, setTransactions] = useState<LedgerEntry[]>(SEED_TRANSACTIONS);
  const [categories] = useState<Category[]>(SEED_CATEGORIES);

  const createAccount = useCallback((input: AccountInput) => {
    setAccounts((previous) => [
      ...previous,
      { ...input, id: `acc-${crypto.randomUUID()}`, isArchived: false },
    ]);
  }, []);

  const updateAccount = useCallback((id: string, input: AccountInput) => {
    setAccounts((previous) =>
      previous.map((account) => (account.id === id ? { ...account, ...input } : account)),
    );
  }, []);

  // Archiving flips a flag and nothing else. Transactions are never touched
  // (I10), which is why this is safe next to a destructive-looking control.
  const setArchived = useCallback((id: string, isArchived: boolean) => {
    setAccounts((previous) =>
      previous.map((account) => (account.id === id ? { ...account, isArchived } : account)),
    );
  }, []);

  const createTransaction = useCallback((input: TransactionInput) => {
    setTransactions((previous) => {
      // Idempotency: a repeated key is a no-op returning the existing row.
      if (previous.some((entry) => entry.id === input.idempotencyKey)) return previous;

      return [
        ...previous,
        {
          id: input.idempotencyKey,
          accountId: input.accountId,
          categoryId: input.categoryId,
          amountMinor: signedAmountMinor(input.magnitudeMinor, input.kind),
          kind: input.kind,
          status: 'POSTED',
          date: input.date,
          payee: input.payee ?? null,
          notes: input.notes ?? null,
        },
      ];
    });
  }, []);

  const updateTransaction = useCallback((id: string, input: TransactionInput) => {
    setTransactions((previous) =>
      previous.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              accountId: input.accountId,
              categoryId: input.categoryId,
              amountMinor: signedAmountMinor(input.magnitudeMinor, input.kind),
              kind: input.kind,
              date: input.date,
              payee: input.payee ?? null,
              notes: input.notes ?? null,
            }
          : entry,
      ),
    );
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((previous) => previous.filter((entry) => entry.id !== id));
  }, []);

  // One pass over the ledger, rather than a filter per account: the real
  // implementation is a single grouped aggregate, and this mirrors its shape.
  const accountViews = useMemo<AccountView[]>(() => {
    const amountsByAccount = new Map<string, bigint[]>();
    for (const entry of transactions) {
      const existing = amountsByAccount.get(entry.accountId);
      if (existing === undefined) amountsByAccount.set(entry.accountId, [entry.amountMinor]);
      else existing.push(entry.amountMinor);
    }

    return accounts.map((account) => {
      const amounts = amountsByAccount.get(account.id) ?? [];
      return {
        ...account,
        transactionAmounts: amounts,
        balanceMinor: currentBalanceMinor(account.openingBalanceMinor, amounts),
      };
    });
  }, [accounts, transactions]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      accounts: accountViews,
      transactions,
      categories,
      createAccount,
      updateAccount,
      setArchived,
      createTransaction,
      updateTransaction,
      deleteTransaction,
    }),
    [
      accountViews,
      transactions,
      categories,
      createAccount,
      updateAccount,
      setArchived,
      createTransaction,
      updateTransaction,
      deleteTransaction,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (context === null) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
