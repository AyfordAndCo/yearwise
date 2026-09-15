import { addDays, resolveCategoryIds } from '@yearwise/logic';
import type { LedgerFilter, TransactionKind } from '@yearwise/logic';
import type { Category } from '@/lib/workspace-store';

/**
 * The filter as the UI holds it.
 *
 * `toDate` is **inclusive** here, because that is how a person reads a date
 * range picker. The conversion to the application's half-open `[from, to)`
 * happens once, in `toDomainFilter`.
 */
export interface LedgerFilterState {
  fromDate: string;
  toDate: string;
  accountIds: string[];
  categoryIds: string[];
  kinds: TransactionKind[];
  search: string;
}

export const EMPTY_LEDGER_FILTER: LedgerFilterState = {
  fromDate: '',
  toDate: '',
  accountIds: [],
  categoryIds: [],
  kinds: [],
  search: '',
};

/**
 * Convert what the user picked into the domain filter.
 *
 * A UI range of "1 to 31 March" becomes `fromDate = 2026-03-01`,
 * `toDate = 2026-04-01`. Doing this anywhere else invites `<=` on the upper
 * bound, which silently includes the first moment of the next day.
 *
 * Category selection is expanded to include descendants here, once, so the
 * predicate is an `IN` over a resolved id set rather than a recursive query.
 */
export function toDomainFilter(
  state: LedgerFilterState,
  categories: readonly Category[],
): LedgerFilter {
  return {
    fromDate: state.fromDate === '' ? undefined : state.fromDate,
    toDate: state.toDate === '' ? undefined : addDays(state.toDate, 1),
    accountIds: state.accountIds,
    categoryIds:
      state.categoryIds.length === 0 ? undefined : resolveCategoryIds(categories, state.categoryIds),
    kinds: state.kinds,
    search: state.search,
  };
}

/** How many filters are narrowing the list, for the "clear all" affordance. */
export function activeFilterCount(state: LedgerFilterState): number {
  let count = 0;
  if (state.fromDate !== '' || state.toDate !== '') count += 1;
  if (state.accountIds.length > 0) count += 1;
  if (state.categoryIds.length > 0) count += 1;
  if (state.kinds.length > 0) count += 1;
  if (state.search.trim() !== '') count += 1;
  return count;
}
