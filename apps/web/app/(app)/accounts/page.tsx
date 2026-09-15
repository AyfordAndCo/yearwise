'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Menu,
  MoneyText,
  Table,
} from '@yearwise/ui';
import type { TableColumn } from '@yearwise/ui';
import { ACCOUNT_KIND_ORDER } from '@yearwise/logic';
import { AccountDrawer } from '@/components/common/account-drawer';
import { NetWorthHeader } from '@/components/common/net-worth-header';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { ACCOUNT_TYPE_LABELS } from '@/lib/account-types';
import { useAccounts } from '@/lib/accounts-store';
import type { AccountInput, AccountView } from '@/lib/accounts-store';
import { WORKSPACE } from '@/lib/workspace';

export default function AccountsPage() {
  const { accounts, createAccount, updateAccount, setArchived } = useAccounts();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AccountView | undefined>(undefined);
  const [confirming, setConfirming] = useState<AccountView | undefined>(undefined);

  const openCreate = () => {
    setEditing(undefined);
    setDrawerOpen(true);
  };

  const openEdit = (account: AccountView) => {
    setEditing(account);
    setDrawerOpen(true);
  };

  const handleSubmit = (input: AccountInput) => {
    if (editing === undefined) createAccount(input);
    else updateAccount(editing.id, input);
    setDrawerOpen(false);
    setEditing(undefined);
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

  // Built each render rather than memoised: the renderers close over the
  // current handlers, and a `useMemo` with empty deps would pin the first
  // render's closures.
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
        // flipped and labelled "owed" by MoneyText; a negative asset balance
        // keeps its minus sign.
        <MoneyText
          amountMinor={account.balanceMinor}
          currency={WORKSPACE.currency}
          locale={WORKSPACE.locale}
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
    <PageContainer>
      <PageHeader
        title="Accounts"
        description="Every place your money sits, and the balance we derive for it."
        actions={<Button onClick={openCreate}>New account</Button>}
      />

      <NetWorthHeader entries={netWorthEntries} />

      {accounts.length === 0 ? (
        <EmptyState
          variant="no-data"
          title="No accounts yet"
          description="Add the first place your money sits — a cheque account, a savings account, or a card."
          action={<Button onClick={openCreate}>Create your first account</Button>}
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
          if (archiving !== undefined) setArchived(archiving.id, !archiving.isArchived);
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
    </PageContainer>
  );
}
