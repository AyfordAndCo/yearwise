'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, ConfirmDialog, EmptyState, Menu, MoneyText, Table } from '@yearwise/ui';
import type { TableColumn } from '@yearwise/ui';
import type { AccountDto } from '@yearwise/types';
import { ACCOUNT_KIND_ORDER } from '@yearwise/logic';
import { AccountDrawer } from '@/components/common/account-drawer';
import { NetWorthHeader } from '@/components/common/net-worth-header';
import { PageHeader } from '@/components/layout/page-header';
import { ACCOUNT_TYPE_LABELS } from '@/lib/account-types';
import { readApiFailure, toAccountInputDto, toAccountView } from '@/lib/account-mapper';
import type { AccountInput, AccountView } from '@/lib/workspace-store';

export interface AccountsScreenProps {
  initialAccounts: AccountView[];
  currency: string;
  locale: string;
}

/**
 * Accounts, against the database.
 *
 * The initial data is loaded on the server and passed in, so there is no fetch
 * on mount and no loading flash. Mutations go through the REST route handlers
 * and the response replaces the affected row, so a save does not require a
 * refetch.
 */
export function AccountsScreen({ initialAccounts, currency, locale }: AccountsScreenProps) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountView[]>(initialAccounts);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AccountView | undefined>(undefined);
  const [confirming, setConfirming] = useState<AccountView | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setEditing(undefined);
    setDrawerOpen(true);
  };

  const openEdit = (account: AccountView) => {
    setEditing(account);
    setDrawerOpen(true);
  };

  /** Replace one row from the server's response, so state cannot drift. */
  const applyAccount = (dto: AccountDto) => {
    const view = toAccountView(dto);
    setAccounts((previous) => {
      const exists = previous.some((account) => account.id === view.id);
      return exists
        ? previous.map((account) => (account.id === view.id ? view : account))
        : [...previous, view];
    });
    // The sidebar's net worth is server-rendered from the same table.
    router.refresh();
  };

  const handleSubmit = async (input: AccountInput) => {
    setBusy(true);
    setError(undefined);

    const editingId = editing?.id;
    const response = await fetch(
      editingId === undefined ? '/api/accounts' : `/api/accounts/${editingId}`,
      {
        method: editingId === undefined ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toAccountInputDto(input)),
      },
    );

    setBusy(false);

    if (!response.ok) {
      const failure = await readApiFailure(response);
      setError(failure.error);
      return;
    }

    applyAccount((await response.json()) as AccountDto);
    setDrawerOpen(false);
    setEditing(undefined);
  };

  const handleArchive = async (account: AccountView, isArchived: boolean) => {
    setBusy(true);
    setError(undefined);

    const response = await fetch(`/api/accounts/${account.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived }),
    });

    setBusy(false);

    if (!response.ok) {
      const failure = await readApiFailure(response);
      setError(failure.error);
      return;
    }

    applyAccount((await response.json()) as AccountDto);
  };

  // Group order comes from the domain, not from insertion order, so assets read
  // before debt and a newly added account does not jump to the top.
  const ordered = useMemo(
    () =>
      [...accounts].sort((a, b) => {
        const byKind = ACCOUNT_KIND_ORDER.indexOf(a.type) - ACCOUNT_KIND_ORDER.indexOf(b.type);
        if (byKind !== 0) return byKind;
        if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
        return a.name.localeCompare(b.name);
      }),
    [accounts],
  );

  const netWorthEntries = useMemo(
    () =>
      accounts.map((account) => ({
        balanceMinor: account.balanceMinor,
        includeInNetWorth: account.includeInNetWorth,
        isArchived: account.isArchived,
      })),
    [accounts],
  );

  const columns: TableColumn<AccountView>[] = [
    {
      key: 'name',
      header: 'Account',
      render: (account) => (
        <span className="flex items-center gap-2">
          <span className={account.isArchived ? 'text-muted' : undefined}>{account.name}</span>
          {account.isArchived && <Badge>Archived</Badge>}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (account) => <Badge tone="neutral">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (account) => (
        // `neutral` on purpose: a balance is not income or expense. Debt is
        // flipped and labelled "owed" by MoneyText.
        <MoneyText
          amountMinor={account.balanceMinor}
          currency={currency}
          locale={locale}
          accountType={account.type}
          owed
          tone="neutral"
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '3rem',
      render: (account) => (
        <Menu
          label={`Actions for ${account.name}`}
          items={[
            { key: 'edit', label: 'Edit', onSelect: () => openEdit(account) },
            {
              key: 'archive',
              label: account.isArchived ? 'Unarchive' : 'Archive',
              tone: account.isArchived ? 'default' : 'danger',
              onSelect: () => setConfirming(account),
            },
          ]}
        />
      ),
    },
  ];

  const archiving = confirming;

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Every place your money sits, and the balance we derive for it."
        actions={
          <Button onClick={openCreate} disabled={busy}>
            New account
          </Button>
        }
      />

      {error !== undefined && (
        <p role="alert" className="mb-4 rounded-md border border-danger bg-danger-dim px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <NetWorthHeader entries={netWorthEntries} currency={currency} locale={locale} />

      {accounts.length === 0 ? (
        <EmptyState
          variant="no-data"
          title="No accounts yet"
          description="Add the first place your money sits — a cheque account, a savings account, or a card."
          action={
            <Button onClick={openCreate} disabled={busy}>
              Create your first account
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <Table
            label="Accounts"
            columns={columns}
            rows={ordered}
            getRowKey={(account) => account.id}
            groupBy={(account) => ACCOUNT_TYPE_LABELS[account.type]}
          />
        </div>
      )}

      <AccountDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(undefined);
        }}
        account={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={archiving !== undefined}
        onClose={() => setConfirming(undefined)}
        onConfirm={() => {
          if (archiving !== undefined) void handleArchive(archiving, !archiving.isArchived);
          setConfirming(undefined);
        }}
        tone={archiving?.isArchived === true ? 'default' : 'danger'}
        title={archiving?.isArchived === true ? 'Unarchive this account?' : 'Archive this account?'}
        description={
          archiving === undefined
            ? undefined
            : archiving.isArchived
              ? 'It returns to the pickers and to net worth. Its transactions were never touched.'
              : 'Its transactions stay in the ledger and stay visible, but the balance stops counting toward net worth. Deleting an account is not offered, so history is never lost.'
        }
        confirmLabel={archiving?.isArchived === true ? 'Unarchive' : 'Archive'}
      />
    </>
  );
}
