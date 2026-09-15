import { prisma } from '@yearwise/database';
import type { AccountDto, AccountInputDto } from '@yearwise/types';
import { fromIsoDateForPrisma, toIsoDateFromPrisma } from './prisma-date';
import { getActiveWorkspace } from './workspace';

/**
 * Accounts, against Postgres.
 *
 * Balances are **derived on read** and never stored (I3). There is no `balance`
 * column to keep in step, which is why editing an opening balance needs no
 * recomputation pass.
 */

interface AccountRow {
  id: string;
  name: string;
  type: AccountDto['type'];
  openingBalanceMinor: bigint;
  openingDate: Date;
  includeInNetWorth: boolean;
  isArchived: boolean;
}

function toDto(account: AccountRow, balanceMinor: bigint): AccountDto {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    // Money crosses the API boundary as a string (A1, M4).
    openingBalanceMinor: account.openingBalanceMinor.toString(),
    openingDate: toIsoDateFromPrisma(account.openingDate),
    includeInNetWorth: account.includeInNetWorth,
    isArchived: account.isArchived,
    balanceMinor: balanceMinor.toString(),
  };
}

export async function listAccounts(): Promise<AccountDto[]> {
  const workspace = await getActiveWorkspace();

  const [accounts, sums] = await Promise.all([
    prisma.account.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ type: 'asc' }, { isArchived: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    }),
    // One grouped aggregate, not one query per account. "Listing 20 accounts
    // issues a bounded number of database queries, independent of the account
    // count" is a stated requirement, not an optimisation (FEAT-FIN-01).
    prisma.transaction.groupBy({
      by: ['accountId'],
      where: { workspaceId: workspace.id },
      _sum: { amountMinor: true },
    }),
  ]);

  const summedByAccount = new Map(
    sums.map((row) => [row.accountId, row._sum.amountMinor ?? 0n] as const),
  );

  return accounts.map((account) =>
    toDto(account, account.openingBalanceMinor + (summedByAccount.get(account.id) ?? 0n)),
  );
}

async function requireAccount(id: string, workspaceId: string) {
  const account = await prisma.account.findFirst({ where: { id, workspaceId } });
  if (account === null) throw new Error('Account not found');
  return account;
}

export async function createAccount(input: AccountInputDto): Promise<AccountDto> {
  const workspace = await getActiveWorkspace();

  const account = await prisma.account.create({
    data: {
      workspaceId: workspace.id,
      name: input.name,
      type: input.type,
      openingBalanceMinor: BigInt(input.openingBalanceMinor),
      openingDate: fromIsoDateForPrisma(input.openingDate),
      includeInNetWorth: input.includeInNetWorth,
      // Denormalised from the workspace so a query needs no join. Invariant I2
      // requires they agree.
      currency: workspace.currency,
    },
  });

  // A new account has no transactions, so the derived balance is the opening one.
  return toDto(account, account.openingBalanceMinor);
}

export async function updateAccount(id: string, input: AccountInputDto): Promise<AccountDto> {
  const workspace = await getActiveWorkspace();
  await requireAccount(id, workspace.id);

  const account = await prisma.account.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      openingBalanceMinor: BigInt(input.openingBalanceMinor),
      openingDate: fromIsoDateForPrisma(input.openingDate),
      includeInNetWorth: input.includeInNetWorth,
    },
  });

  const sum = await prisma.transaction.aggregate({
    where: { accountId: id },
    _sum: { amountMinor: true },
  });

  return toDto(account, account.openingBalanceMinor + (sum._sum.amountMinor ?? 0n));
}

/**
 * Archive or unarchive.
 *
 * Flips a flag and nothing else: transactions are never touched (I10). Delete is
 * deliberately not offered, which is what makes referential integrity here a
 * non-issue.
 */
export async function setAccountArchived(id: string, isArchived: boolean): Promise<AccountDto> {
  const workspace = await getActiveWorkspace();
  await requireAccount(id, workspace.id);

  const account = await prisma.account.update({
    where: { id },
    data: { isArchived, archivedAt: isArchived ? new Date() : null },
  });

  const sum = await prisma.transaction.aggregate({
    where: { accountId: id },
    _sum: { amountMinor: true },
  });

  return toDto(account, account.openingBalanceMinor + (sum._sum.amountMinor ?? 0n));
}
