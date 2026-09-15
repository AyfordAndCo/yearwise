import { MoneyText } from '@yearwise/ui';
import { excludedFromNetWorthCount, netWorthMinor } from '@yearwise/logic';
import type { NetWorthEntry } from '@yearwise/logic';

export interface NetWorthHeaderProps {
  entries: readonly NetWorthEntry[];
  currency: string;
  locale: string;
}

/**
 * The single figure that summarises every account.
 *
 * Debt needs no special case here: it is already negative by the sign
 * convention, so net worth is a plain sum (FEAT-FIN-01).
 */
export function NetWorthHeader({ entries, currency, locale }: NetWorthHeaderProps) {
  const total = netWorthMinor(entries);
  const excluded = excludedFromNetWorthCount(entries);

  return (
    <section className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-border bg-surface px-4 py-3">
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Net worth</span>
        <span className="text-2xl font-semibold">
          <MoneyText amountMinor={total} currency={currency} locale={locale} />
        </span>
      </div>

      {excluded > 0 && (
        <p className="text-xs text-muted">
          {excluded} {excluded === 1 ? 'account' : 'accounts'} excluded from net worth
        </p>
      )}
    </section>
  );
}
