import { describe, expect, it } from 'vitest';
import { activeFilterCount, toDomainFilter } from '@/lib/ledger-filter';
import { EMPTY_LEDGER_FILTER } from '@/lib/ledger-filter';
import type { Category } from '@/lib/workspace-store';

const categories: Category[] = [
  { id: 'food', name: 'Food', parentId: null, type: 'EXPENSE', isArchived: false },
  { id: 'groceries', name: 'Groceries', parentId: 'food', type: 'EXPENSE', isArchived: false },
  { id: 'income', name: 'Salary', parentId: null, type: 'INCOME', isArchived: false },
];

describe('toDomainFilter', () => {
  it('leaves an empty filter wide open', () => {
    const filter = toDomainFilter(EMPTY_LEDGER_FILTER, categories);

    expect(filter.fromDate).toBeUndefined();
    expect(filter.toDate).toBeUndefined();
    expect(filter.categoryIds).toBeUndefined();
  });

  it('converts an inclusive UI range into a half-open one', () => {
    // "1 to 31 March" is transmitted as toDate = 1 April.
    const filter = toDomainFilter(
      { ...EMPTY_LEDGER_FILTER, fromDate: '2026-03-01', toDate: '2026-03-31' },
      categories,
    );

    expect(filter.fromDate).toBe('2026-03-01');
    expect(filter.toDate).toBe('2026-04-01');
  });

  it('rolls over a month end and a year end', () => {
    expect(
      toDomainFilter({ ...EMPTY_LEDGER_FILTER, toDate: '2026-12-31' }, categories).toDate,
    ).toBe('2027-01-01');
    expect(
      toDomainFilter({ ...EMPTY_LEDGER_FILTER, toDate: '2028-02-29' }, categories).toDate,
    ).toBe('2028-03-01');
  });

  it('leaves a single day as that one day, inclusive', () => {
    const filter = toDomainFilter(
      { ...EMPTY_LEDGER_FILTER, fromDate: '2026-03-14', toDate: '2026-03-14' },
      categories,
    );

    expect(filter.fromDate).toBe('2026-03-14');
    expect(filter.toDate).toBe('2026-03-15');
  });

  it('expands a parent category to include its children', () => {
    // Selecting Food must also match Groceries (FEAT-FIN-03).
    const filter = toDomainFilter({ ...EMPTY_LEDGER_FILTER, categoryIds: ['food'] }, categories);

    expect([...(filter.categoryIds ?? [])].sort()).toEqual(['food', 'groceries']);
  });

  it('does not expand when nothing is selected', () => {
    expect(toDomainFilter(EMPTY_LEDGER_FILTER, categories).categoryIds).toBeUndefined();
  });

  it('passes the remaining dimensions straight through', () => {
    const filter = toDomainFilter(
      {
        ...EMPTY_LEDGER_FILTER,
        accountIds: ['a1'],
        kinds: ['INCOME'],
        search: 'salary',
      },
      categories,
    );

    expect(filter.accountIds).toEqual(['a1']);
    expect(filter.kinds).toEqual(['INCOME']);
    expect(filter.search).toBe('salary');
  });
});

describe('activeFilterCount', () => {
  it('is zero for the empty filter', () => {
    expect(activeFilterCount(EMPTY_LEDGER_FILTER)).toBe(0);
  });

  it('counts a date range as one filter, not two', () => {
    expect(activeFilterCount({ ...EMPTY_LEDGER_FILTER, fromDate: '2026-03-01' })).toBe(1);
    expect(
      activeFilterCount({ ...EMPTY_LEDGER_FILTER, fromDate: '2026-03-01', toDate: '2026-03-31' }),
    ).toBe(1);
  });

  it('counts each dimension once', () => {
    expect(
      activeFilterCount({
        fromDate: '2026-03-01',
        toDate: '2026-03-31',
        accountIds: ['a1', 'a2'],
        categoryIds: ['food'],
        kinds: ['EXPENSE'],
        search: 'wool',
      }),
    ).toBe(5);
  });

  it('ignores a blank search', () => {
    expect(activeFilterCount({ ...EMPTY_LEDGER_FILTER, search: '   ' })).toBe(0);
  });
});
