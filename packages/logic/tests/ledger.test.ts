import { describe, expect, it } from 'vitest';
import {
  LEDGER_PAGE_SIZE,
  decodeLedgerCursor,
  encodeLedgerCursor,
  isAfterCursor,
  ledgerTotals,
  matchesLedgerFilter,
  pageAfter,
  signedAmountMinor,
  sortLedger,
} from '../src/ledger';
import type { LedgerEntry } from '../src/ledger';

function entry(overrides: Partial<LedgerEntry> & { id: string }): LedgerEntry {
  return {
    accountId: 'acc-current',
    categoryId: 'cat-food',
    amountMinor: -1000n,
    kind: 'EXPENSE',
    status: 'POSTED',
    date: '2026-03-14',
    ...overrides,
  };
}

describe('signedAmountMinor', () => {
  it('derives the sign from kind, never from the typed amount', () => {
    expect(signedAmountMinor(2500n, 'INCOME')).toBe(2500n);
    expect(signedAmountMinor(2500n, 'EXPENSE')).toBe(-2500n);
  });

  it('keeps a transfer positive, because it is the outgoing leg that flips', () => {
    expect(signedAmountMinor(2500n, 'TRANSFER')).toBe(2500n);
  });
});

describe('ledgerTotals', () => {
  it('is zero for nothing', () => {
    expect(ledgerTotals([])).toEqual({ incomeMinor: 0n, expensesMinor: 0n, netMinor: 0n });
  });

  it('reports expenses as a positive magnitude', () => {
    const totals = ledgerTotals([
      entry({ id: 'a', kind: 'EXPENSE', amountMinor: -34200n }),
      entry({ id: 'b', kind: 'EXPENSE', amountMinor: -68000n }),
    ]);

    expect(totals.expensesMinor).toBe(102200n);
    expect(totals.incomeMinor).toBe(0n);
    expect(totals.netMinor).toBe(-102200n);
  });

  it('nets income against expenses', () => {
    const totals = ledgerTotals([
      entry({ id: 'a', kind: 'INCOME', amountMinor: 1200000n }),
      entry({ id: 'b', kind: 'EXPENSE', amountMinor: -2097200n }),
    ]);

    expect(totals.incomeMinor).toBe(1200000n);
    expect(totals.expensesMinor).toBe(2097200n);
    expect(totals.netMinor).toBe(-897200n);
  });

  it('sums to exactly 0.10 for ten one-cent entries, not 0.099999', () => {
    const cents = Array.from({ length: 10 }, (_, index) =>
      entry({ id: `e${index}`, kind: 'EXPENSE', amountMinor: -1n }),
    );

    expect(ledgerTotals(cents).expensesMinor).toBe(10n);
  });

  it('equals SUM(amountMinor) across all kinds', () => {
    const entries = [
      entry({ id: 'a', kind: 'INCOME', amountMinor: 500n }),
      entry({ id: 'b', kind: 'EXPENSE', amountMinor: -200n }),
    ];

    const sum = entries.reduce((total, item) => total + item.amountMinor, 0n);
    expect(ledgerTotals(entries).netMinor).toBe(sum);
  });
});

describe('matchesLedgerFilter — the date range is half-open', () => {
  const inMarch = entry({ id: 'a', date: '2026-03-31' });

  it('includes the from date', () => {
    expect(matchesLedgerFilter(inMarch, { fromDate: '2026-03-31' })).toBe(true);
  });

  it('excludes the to date, because the range is [from, to)', () => {
    // A filter of "1 to 31 March" is transmitted as toDate = 1 April.
    expect(matchesLedgerFilter(inMarch, { fromDate: '2026-03-01', toDate: '2026-04-01' })).toBe(
      true,
    );
    expect(matchesLedgerFilter(entry({ id: 'b', date: '2026-04-01' }), {
      fromDate: '2026-03-01',
      toDate: '2026-04-01',
    })).toBe(false);
  });

  it('excludes anything before the from date', () => {
    expect(matchesLedgerFilter(entry({ id: 'c', date: '2026-02-28' }), { fromDate: '2026-03-01' })).toBe(
      false,
    );
  });

  it('passes everything with an empty filter', () => {
    expect(matchesLedgerFilter(inMarch, {})).toBe(true);
  });
});

describe('matchesLedgerFilter — the other dimensions', () => {
  it('filters by account, and ignores an empty selection', () => {
    const item = entry({ id: 'a', accountId: 'acc-card' });

    expect(matchesLedgerFilter(item, { accountIds: ['acc-card'] })).toBe(true);
    expect(matchesLedgerFilter(item, { accountIds: ['acc-current'] })).toBe(false);
    expect(matchesLedgerFilter(item, { accountIds: [] })).toBe(true);
  });

  it('matches a category only from the resolved id set', () => {
    // The caller expands a parent to its children via resolveCategoryIds; this
    // predicate only does an IN over the result.
    const item = entry({ id: 'a', categoryId: 'cat-groceries' });

    expect(matchesLedgerFilter(item, { categoryIds: ['cat-food', 'cat-groceries'] })).toBe(true);
    expect(matchesLedgerFilter(item, { categoryIds: ['cat-food'] })).toBe(false);
  });

  it('filters by kind', () => {
    const item = entry({ id: 'a', kind: 'INCOME', amountMinor: 1n });

    expect(matchesLedgerFilter(item, { kinds: ['INCOME'] })).toBe(true);
    expect(matchesLedgerFilter(item, { kinds: ['EXPENSE'] })).toBe(false);
  });

  it('searches payee and notes, case-insensitively', () => {
    const item = entry({ id: 'a', payee: 'Woolworths', notes: 'Weekly shop' });

    expect(matchesLedgerFilter(item, { search: 'wool' })).toBe(true);
    expect(matchesLedgerFilter(item, { search: 'WEEKLY' })).toBe(true);
    expect(matchesLedgerFilter(item, { search: 'petrol' })).toBe(false);
  });

  it('treats a blank search as no filter', () => {
    expect(matchesLedgerFilter(entry({ id: 'a' }), { search: '   ' })).toBe(true);
  });

  it('searches a row with no payee or notes without throwing', () => {
    expect(matchesLedgerFilter(entry({ id: 'a' }), { search: 'anything' })).toBe(false);
  });

  it('combines dimensions conjunctively', () => {
    const item = entry({ id: 'a', accountId: 'acc-current', kind: 'EXPENSE', date: '2026-03-14' });

    expect(
      matchesLedgerFilter(item, {
        fromDate: '2026-03-01',
        toDate: '2026-04-01',
        accountIds: ['acc-current'],
        kinds: ['EXPENSE'],
      }),
    ).toBe(true);

    // One failing dimension is enough to exclude.
    expect(
      matchesLedgerFilter(item, {
        fromDate: '2026-03-01',
        accountIds: ['acc-current'],
        kinds: ['INCOME'],
      }),
    ).toBe(false);
  });
});

describe('sortLedger', () => {
  it('orders by date descending, then id descending', () => {
    const sorted = sortLedger([
      entry({ id: 'a', date: '2026-03-14' }),
      entry({ id: 'c', date: '2026-03-13' }),
      entry({ id: 'b', date: '2026-03-14' }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('does not mutate the input', () => {
    const input = [entry({ id: 'a', date: '2026-03-13' }), entry({ id: 'b', date: '2026-03-14' })];
    const before = input.map((item) => item.id);

    sortLedger(input);

    expect(input.map((item) => item.id)).toEqual(before);
  });
});

describe('the keyset cursor', () => {
  it('round-trips', () => {
    const cursor = { date: '2026-03-14', id: 'a1b2c3d4-0000-7000-8000-000000000000' };
    expect(decodeLedgerCursor(encodeLedgerCursor(cursor))).toEqual(cursor);
  });

  it('is opaque to the client', () => {
    // Base64 of "2026-03-14|a1" — a URL-safe-looking token, not a readable key.
    const encoded = encodeLedgerCursor({ date: '2026-03-14', id: 'a1' });

    expect(encoded).not.toContain('|');
    expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('returns undefined for anything malformed rather than throwing', () => {
    expect(decodeLedgerCursor('')).toBeUndefined();
    // Not base64 at all.
    expect(decodeLedgerCursor('!!!')).toBeUndefined();
    // Valid base64 of "notcursor": decodes fine, but carries no separator.
    expect(decodeLedgerCursor('bm90Y3Vyc29y')).toBeUndefined();
  });

  it('compares as a row value, not on date alone', () => {
    const cursor = { date: '2026-03-14', id: 'b' };

    expect(isAfterCursor({ date: '2026-03-14', id: 'a' }, cursor)).toBe(true);
    expect(isAfterCursor({ date: '2026-03-14', id: 'b' }, cursor)).toBe(false);
    expect(isAfterCursor({ date: '2026-03-14', id: 'c' }, cursor)).toBe(false);
    expect(isAfterCursor({ date: '2026-03-13', id: 'z' }, cursor)).toBe(true);
  });
});

describe('pageAfter', () => {
  const ledger = [
    entry({ id: 'a', date: '2026-03-14' }),
    entry({ id: 'b', date: '2026-03-14' }),
    entry({ id: 'c', date: '2026-03-13' }),
    entry({ id: 'd', date: '2026-03-12' }),
  ];

  it('returns the first page when there is no cursor', () => {
    expect(pageAfter(ledger, undefined, 2).map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('continues strictly after the cursor', () => {
    const page = pageAfter(ledger, { date: '2026-03-14', id: 'a' }, 2);
    expect(page.map((item) => item.id)).toEqual(['c', 'd']);
  });

  it('returns nothing past the end', () => {
    expect(pageAfter(ledger, { date: '2026-03-12', id: 'd' }, 2)).toEqual([]);
  });

  it('defaults to the fixed page size', () => {
    const many = Array.from({ length: LEDGER_PAGE_SIZE + 10 }, (_, index) =>
      entry({ id: `id-${String(index).padStart(3, '0')}`, date: '2026-03-14' }),
    );

    expect(pageAfter(many, undefined)).toHaveLength(LEDGER_PAGE_SIZE);
  });

  it('does not skip or duplicate when a row is inserted while paging', () => {
    // This is the acceptance criterion, and the reason OFFSET is prohibited.
    const first = pageAfter(ledger, undefined, 2);
    expect(first.map((item) => item.id)).toEqual(['b', 'a']);

    const cursor = { date: first[1]!.date, id: first[1]!.id };
    const withNewest = [entry({ id: 'z', date: '2026-03-15' }), ...ledger];

    const second = pageAfter(withNewest, cursor, 2);

    expect(second.map((item) => item.id)).toEqual(['c', 'd']);
    // Nothing from page one reappears, and nothing was passed over.
    const seen = [...first, ...second].map((item) => item.id);
    expect(new Set(seen).size).toBe(seen.length);
  });
});
