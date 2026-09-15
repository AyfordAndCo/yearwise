/**
 * The ledger.
 *
 * Pure rules for FEAT-FIN-03: the sign of a transaction, the totals strip, the
 * filter predicates, the sort order, and the opaque keyset cursor.
 *
 * All of it is derived on read (A8) and none of it touches I/O. The pages that
 * use it are downstream of these decisions, so a bug here is a wrong balance on
 * every screen at once.
 */

import { compareIsoDate, isIsoDate } from './date';
import type { IsoDate } from './date';

export type TransactionKind = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionStatus = 'POSTED' | 'PENDING';

/** Fixed page size. `OFFSET` is prohibited (FEAT-FIN-03). */
export const LEDGER_PAGE_SIZE = 50;

/**
 * Sign comes from `kind`, never from what the user typed.
 *
 * The amount field takes a positive magnitude; this is what makes
 * `kind = INCOME implies amountMinor > 0` a database constraint rather than a
 * convention (I7).
 */
export function signedAmountMinor(magnitudeMinor: bigint, kind: TransactionKind): bigint {
  return kind === 'EXPENSE' ? -magnitudeMinor : magnitudeMinor;
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  categoryId: string;
  /** Signed. Negative is money out (A2). */
  amountMinor: bigint;
  kind: TransactionKind;
  status: TransactionStatus;
  /** A naive calendar date (A6). */
  date: IsoDate;
  payee?: string | null;
  notes?: string | null;
}

export interface LedgerTotals {
  incomeMinor: bigint;
  /** A positive figure, ready to display. */
  expensesMinor: bigint;
  netMinor: bigint;
}

/**
 * The totals strip.
 *
 * Computed over the **entire filtered set**, never the loaded page: a total
 * that changes as the user scrolls is worse than no total (FEAT-FIN-03).
 */
export function ledgerTotals(entries: readonly LedgerEntry[]): LedgerTotals {
  let incomeMinor = 0n;
  let expenseMinor = 0n;

  for (const entry of entries) {
    if (entry.kind === 'INCOME') incomeMinor += entry.amountMinor;
    else if (entry.kind === 'EXPENSE') expenseMinor += entry.amountMinor;
  }

  // Expenses are stored negative; the strip shows a positive magnitude.
  const expensesMinor = expenseMinor < 0n ? -expenseMinor : expenseMinor;

  return {
    incomeMinor,
    expensesMinor,
    // Identical to SUM(amountMinor) across all kinds.
    netMinor: incomeMinor - expensesMinor,
  };
}

export interface LedgerFilter {
  /** Inclusive. */
  fromDate?: IsoDate;
  /** **Exclusive.** Every range in the application is `[from, to)`. */
  toDate?: IsoDate;
  accountIds?: readonly string[];
  /** Already expanded to include descendants, via `resolveCategoryIds`. */
  categoryIds?: readonly string[];
  kinds?: readonly TransactionKind[];
  /** Case-insensitive match against payee or notes. */
  search?: string;
}

/**
 * Whether an entry passes the filter.
 *
 * `toDate` is exclusive on purpose. Writing `<=` on the upper bound silently
 * includes the first moment of the next day, which is the most common
 * off-by-one in this product.
 */
export function matchesLedgerFilter(entry: LedgerEntry, filter: LedgerFilter): boolean {
  if (filter.fromDate !== undefined && compareIsoDate(entry.date, filter.fromDate) < 0) {
    return false;
  }

  if (filter.toDate !== undefined && compareIsoDate(entry.date, filter.toDate) >= 0) {
    return false;
  }

  if (
    filter.accountIds !== undefined &&
    filter.accountIds.length > 0 &&
    !filter.accountIds.includes(entry.accountId)
  ) {
    return false;
  }

  if (
    filter.categoryIds !== undefined &&
    filter.categoryIds.length > 0 &&
    !filter.categoryIds.includes(entry.categoryId)
  ) {
    return false;
  }

  if (
    filter.kinds !== undefined &&
    filter.kinds.length > 0 &&
    !filter.kinds.includes(entry.kind)
  ) {
    return false;
  }

  const needle = filter.search?.trim().toLowerCase();
  if (needle !== undefined && needle !== '') {
    const haystack = `${entry.payee ?? ''} ${entry.notes ?? ''}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

/** Ledger order: `date DESC, id DESC`. */
export function compareLedgerOrder(
  a: { date: IsoDate; id: string },
  b: { date: IsoDate; id: string },
): number {
  const byDate = compareIsoDate(b.date, a.date);
  if (byDate !== 0) return byDate;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

export function sortLedger<T extends { date: IsoDate; id: string }>(entries: readonly T[]): T[] {
  return [...entries].sort(compareLedgerOrder);
}

/**
 * A keyset position.
 *
 * Row-value comparison against `(date, id)`, which is what the index
 * `(workspaceId, date DESC, id DESC)` exists to serve. It survives an insert at
 * the top of the list, which `OFFSET` does not.
 */
export interface LedgerCursor {
  date: IsoDate;
  id: string;
}

export function isAfterCursor(
  candidate: { date: IsoDate; id: string },
  cursor: LedgerCursor,
): boolean {
  return compareLedgerOrder(candidate, cursor) > 0;
}

export function pageAfter<T extends { date: IsoDate; id: string }>(
  entries: readonly T[],
  cursor: LedgerCursor | undefined,
  pageSize: number = LEDGER_PAGE_SIZE,
): T[] {
  const ordered = sortLedger(entries);
  const start =
    cursor === undefined ? 0 : ordered.findIndex((entry) => isAfterCursor(entry, cursor));
  if (start === -1) return [];
  return ordered.slice(start, start + pageSize);
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Base64 implemented here rather than via `btoa`, because this package is pure
 * and must not depend on a browser or Node global. The payload is ASCII
 * (`YYYY-MM-DD|uuid`), so the byte/character distinction does not arise.
 */
function toBase64(input: string): string {
  let output = '';

  for (let index = 0; index < input.length; index += 3) {
    const first = input.charCodeAt(index);
    const hasSecond = index + 1 < input.length;
    const hasThird = index + 2 < input.length;
    const second = hasSecond ? input.charCodeAt(index + 1) : 0;
    const third = hasThird ? input.charCodeAt(index + 2) : 0;

    const triple = (first << 16) | (second << 8) | third;

    output += BASE64_ALPHABET.charAt((triple >> 18) & 63);
    output += BASE64_ALPHABET.charAt((triple >> 12) & 63);
    output += hasSecond ? BASE64_ALPHABET.charAt((triple >> 6) & 63) : '=';
    output += hasThird ? BASE64_ALPHABET.charAt(triple & 63) : '=';
  }

  return output;
}

function fromBase64(input: string): string {
  const clean = input.replace(/=+$/, '');
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const character of clean) {
    const value = BASE64_ALPHABET.indexOf(character);
    if (value === -1) throw new RangeError('Invalid base64');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

/** The cursor is opaque to the client: base64 of `date|id`. */
export function encodeLedgerCursor(cursor: LedgerCursor): string {
  return toBase64(`${cursor.date}|${cursor.id}`);
}

/** Returns `undefined` for anything malformed, rather than throwing at the edge. */
export function decodeLedgerCursor(value: string): LedgerCursor | undefined {
  try {
    const decoded = fromBase64(value);
    const separator = decoded.indexOf('|');
    if (separator === -1) return undefined;

    const date = decoded.slice(0, separator);
    const id = decoded.slice(separator + 1);
    if (!isIsoDate(date) || id === '') return undefined;

    return { date, id };
  } catch {
    return undefined;
  }
}
