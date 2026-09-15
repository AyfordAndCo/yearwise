'use client';

import { useMemo, useState } from 'react';
import { Button, EmptyState, Menu, MoneyText, Table, Toast, ToastRegion } from '@yearwise/ui';
import type { TableColumn } from '@yearwise/ui';
import {
  LEDGER_PAGE_SIZE,
  formatIsoDateForDisplay,
  ledgerTotals,
  matchesLedgerFilter,
  pageAfter,
  sortLedger,
} from '@yearwise/logic';
import type { LedgerCursor, LedgerEntry } from '@yearwise/logic';
import { LedgerFilterBar } from '@/components/common/ledger-filter-bar';
import { LedgerTotalsStrip } from '@/components/common/ledger-totals';
import { TransactionDrawer } from '@/components/common/transaction-drawer';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EMPTY_LEDGER_FILTER, activeFilterCount, toDomainFilter } from '@/lib/ledger-filter';
import type { LedgerFilterState } from '@/lib/ledger-filter';
import { WORKSPACE } from '@/lib/workspace';
import { useWorkspace } from '@/lib/workspace-store';
import type { TransactionInput } from '@/lib/workspace-store';

interface DrawerState {
  open: boolean;
  initial?: LedgerEntry | undefined;
  editing: boolean;
}

const CLOSED_DRAWER: DrawerState = { open: false, editing: false };

export default function TransactionsPage() {
  const { accounts, categories, transactions, createTransaction, updateTransaction, deleteTransaction } =
    useWorkspace();

  const [filter, setFilter] = useState<LedgerFilterState>(EMPTY_LEDGER_FILTER);
  const [pageCount, setPageCount] = useState(1);
  const [drawer, setDrawer] = useState<DrawerState>(CLOSED_DRAWER);
  const [pendingDelete, setPendingDelete] = useState<LedgerEntry | undefined>(undefined);

  const domainFilter = useMemo(() => toDomainFilter(filter, categories), [filter, categories]);

  const filtered = useMemo(
    () => transactions.filter((entry) => matchesLedgerFilter(entry, domainFilter)),
    [transactions, domainFilter],
  );

  // Totals cover the whole filtered set, never the loaded window.
  const totals = useMemo(() => ledgerTotals(filtered), [filtered]);

  const ordered = useMemo(() => sortLedger(filtered), [filtered]);

  // Walk keyset pages rather than slicing. Slicing is OFFSET by another name,
  // and OFFSET shifts the window when a row is inserted at the top.
  const rows = useMemo(() => {
    const collected: LedgerEntry[] = [];
    let cursor: LedgerCursor | undefined;

    for (let page = 0; page < pageCount; page += 1) {
      const chunk = pageAfter(ordered, cursor, LEDGER_PAGE_SIZE);
      collected.push(...chunk);
      const last = chunk[chunk.length - 1];
      if (last === undefined) break;
      cursor = { date: last.date, id: last.id };
    }

    return collected;
  }, [ordered, pageCount]);

  // The row is hidden the moment delete is pressed, but it is not gone until
  // the toast expires. The toast owns it until then.
  const visibleRows = rows.filter((entry) => entry.id !== pendingDelete?.id);
  const hasMore = rows.length < ordered.length;
  const filtering = activeFilterCount(filter) > 0;

  const accountName = (id: string) => accounts.find((item) => item.id === id)?.name ?? 'Unknown';

  const categoryLabel = (id: string) => {
    const category = categories.find((item) => item.id === id);
    if (category === undefined) return 'Uncategorised';
    if (category.parentId === null) return category.name;
    const parent = categories.find((item) => item.id === category.parentId);
    return parent === undefined ? category.name : `${parent.name} \u203a ${category.name}`;
  };

  const openCreate = () => setDrawer({ open: true, editing: false });
  const openEdit = (entry: LedgerEntry) => setDrawer({ open: true, editing: true, initial: entry });
  const openDuplicate = (entry: LedgerEntry) =>
    setDrawer({ open: true, editing: false, initial: entry });

  const handleFilterChange = (next: LedgerFilterState) => {
    setFilter(next);
    // A different filter is a different window; start it from the top.
    setPageCount(1);
  };

  const handleSubmit = (input: TransactionInput) => {
    if (drawer.editing && drawer.initial !== undefined) updateTransaction(drawer.initial.id, input);
    else createTransaction(input);
    setDrawer(CLOSED_DRAWER);
  };

  const commitDelete = () => {
    if (pendingDelete !== undefined) deleteTransaction(pendingDelete.id);
    setPendingDelete(undefined);
  };

  const columns: TableColumn<LedgerEntry>[] = [
    {
      key: 'payee',
      header: 'Payee',
      render: (entry) =>
        entry.payee ?? entry.notes ?? <span className="text-muted">No payee</span>,
    },
    { key: 'category', header: 'Category', render: (entry) => categoryLabel(entry.categoryId) },
    { key: 'account', header: 'Account', render: (entry) => accountName(entry.accountId) },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (entry) => (
        <MoneyText
          amountMinor={entry.amountMinor}
          currency={WORKSPACE.currency}
          locale={WORKSPACE.locale}
          showSign
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '3rem',
      render: (entry) => (
        <Menu
          // Named by payee and date so a row's actions are distinguishable:
          // "Actions for the 2026-03-14 transaction" would match two rows.
          label={`Actions for ${entry.payee ?? entry.notes ?? 'transaction'} on ${entry.date}`}
          items={[
            { key: 'edit', label: 'Edit', onSelect: () => openEdit(entry) },
            { key: 'duplicate', label: 'Duplicate', onSelect: () => openDuplicate(entry) },
            { key: 'delete', label: 'Delete', tone: 'danger', onSelect: () => setPendingDelete(entry) },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Transactions"
        description="The ledger. Totals cover every row that matches the filter, not just the visible page."
        actions={<Button onClick={openCreate}>New transaction</Button>}
      />

      <LedgerFilterBar filter={filter} onChange={handleFilterChange} />

      <LedgerTotalsStrip totals={totals} />

      {transactions.length === 0 ? (
        <EmptyState
          variant="no-data"
          title="Nothing recorded yet"
          description="Record your first transaction and it will appear here, with the account balance moving with it."
          action={<Button onClick={openCreate}>Record a transaction</Button>}
        />
      ) : visibleRows.length === 0 && !filtering ? (
        <EmptyState
          variant="no-data"
          title="Nothing to show"
          description="Every transaction is currently awaiting the undo timer."
        />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          variant="no-matches"
          title="No transactions match"
          description="Try widening the date range, or clearing a filter."
          action={
            <Button variant="secondary" onClick={() => handleFilterChange(EMPTY_LEDGER_FILTER)}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <Table
            label="Transactions"
            columns={columns}
            rows={visibleRows}
            getRowKey={(entry) => entry.id}
            // Grouping is by the date string, never by a parsed instant (A6).
            groupBy={(entry) => formatIsoDateForDisplay(entry.date, WORKSPACE.locale)}
            onRowActivate={openEdit}
          />
        </div>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => setPageCount((count) => count + 1)}>
            Load more
          </Button>
        </div>
      )}

      <TransactionDrawer
        open={drawer.open}
        onClose={() => setDrawer(CLOSED_DRAWER)}
        initial={drawer.initial}
        editing={drawer.editing}
        onSubmit={handleSubmit}
      />

      <ToastRegion>
        <Toast
          open={pendingDelete !== undefined}
          onDismiss={commitDelete}
          title="Transaction deleted"
          description="It is removed when the timer runs out."
          action={{ label: 'Undo', onClick: () => setPendingDelete(undefined) }}
          duration={10_000}
          tone="warning"
        />
      </ToastRegion>
    </PageContainer>
  );
}
