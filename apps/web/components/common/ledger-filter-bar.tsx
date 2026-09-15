'use client';

import { Button, DateField, Input, SegmentedControl } from '@yearwise/ui';
import { AccountMultiSelect, CategoryMultiSelect } from '@yearwise/ui';
import type { TransactionKind } from '@yearwise/logic';
import { EMPTY_LEDGER_FILTER, activeFilterCount } from '@/lib/ledger-filter';
import type { LedgerFilterState } from '@/lib/ledger-filter';
import { useWorkspace } from '@/lib/workspace-store';

const KIND_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
];

export interface LedgerFilterBarProps {
  filter: LedgerFilterState;
  onChange: (filter: LedgerFilterState) => void;
}

/**
 * Narrowing the ledger.
 *
 * Both date fields are **inclusive**, because that is how a person reads a
 * range. The conversion to the application's half-open `[from, to)` happens in
 * `toDomainFilter`, once - `<=` on the upper bound silently includes the first
 * moment of the next day, which is the most common off-by-one here.
 *
 * Active filters render as removable chips, so a short list is never a mystery.
 */
export function LedgerFilterBar({ filter, onChange }: LedgerFilterBarProps) {
  const { accounts, categories } = useWorkspace();
  const activeCount = activeFilterCount(filter);
  const kindValue = filter.kinds.length === 1 ? filter.kinds[0]! : 'ALL';

  const fieldLabel = 'flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted';

  return (
    <section aria-label="Filters" className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className={fieldLabel}>
          From
          <DateField
            aria-label="From date"
            value={filter.fromDate}
            onValueChange={(fromDate) => onChange({ ...filter, fromDate })}
          />
        </label>

        <label className={fieldLabel}>
          To
          <DateField
            aria-label="To date"
            value={filter.toDate}
            onValueChange={(toDate) => onChange({ ...filter, toDate })}
          />
        </label>

        <AccountMultiSelect
          accounts={accounts}
          value={filter.accountIds}
          onValueChange={(accountIds) => onChange({ ...filter, accountIds })}
        />

        <CategoryMultiSelect
          categories={categories}
          value={filter.categoryIds}
          onValueChange={(categoryIds) => onChange({ ...filter, categoryIds })}
        />

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Kind</span>
          <SegmentedControl
            label="Transaction kind"
            options={KIND_OPTIONS}
            value={kindValue}
            onValueChange={(value) =>
              onChange({
                ...filter,
                kinds: value === 'ALL' ? [] : [value as TransactionKind],
              })
            }
          />
        </div>

        <label className={fieldLabel}>
          Search
          <Input
            value={filter.search}
            placeholder="Payee or notes"
            onChange={(event) => onChange({ ...filter, search: event.target.value })}
          />
        </label>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filter.fromDate !== '' && (
            <Chip label={`From ${filter.fromDate}`} onRemove={() => onChange({ ...filter, fromDate: '' })} />
          )}
          {filter.toDate !== '' && (
            <Chip label={`To ${filter.toDate}`} onRemove={() => onChange({ ...filter, toDate: '' })} />
          )}
          {filter.accountIds.length > 0 && (
            <Chip
              label={`${filter.accountIds.length} ${filter.accountIds.length === 1 ? 'account' : 'accounts'}`}
              onRemove={() => onChange({ ...filter, accountIds: [] })}
            />
          )}
          {filter.categoryIds.length > 0 && (
            <Chip
              label={`${filter.categoryIds.length} ${filter.categoryIds.length === 1 ? 'category' : 'categories'}`}
              onRemove={() => onChange({ ...filter, categoryIds: [] })}
            />
          )}
          {filter.kinds.length > 0 && (
            <Chip
              label={filter.kinds[0] === 'INCOME' ? 'Income' : 'Expense'}
              onRemove={() => onChange({ ...filter, kinds: [] })}
            />
          )}
          {filter.search.trim() !== '' && (
            <Chip label={`"${filter.search.trim()}"`} onRemove={() => onChange({ ...filter, search: '' })} />
          )}

          <Button variant="ghost" onClick={() => onChange(EMPTY_LEDGER_FILTER)}>
            Clear all
          </Button>
        </div>
      )}
    </section>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-tint py-0.5 pl-2 pr-1 text-xs text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="rounded-sm px-1 text-primary hover:text-foreground"
      >
        {'\u00d7'}
      </button>
    </span>
  );
}
