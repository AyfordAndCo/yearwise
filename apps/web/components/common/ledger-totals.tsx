'use client';

import { MoneyText } from '@yearwise/ui';
import type { LedgerTotals } from '@yearwise/logic';
import { WORKSPACE } from '@/lib/workspace';

export interface LedgerTotalsStripProps {
  totals: LedgerTotals;
}

/**
 * Income, expenses and net for the **entire filtered set**.
 *
 * Not for the loaded page: a total that changes as the user scrolls is worse
 * than no total (FEAT-FIN-03). Always visible, including when the list is
 * empty, so the three figures never jump around.
 */
export function LedgerTotalsStrip({ totals }: LedgerTotalsStripProps) {
  return (
    <section
      aria-label="Totals for the current filter"
      className="mb-4 grid grid-cols-3 gap-4 rounded-md border border-border bg-surface px-4 py-3"
    >
      <Figure label="Income" amountMinor={totals.incomeMinor} tone="in" />
      <Figure label="Expenses" amountMinor={totals.expensesMinor} tone="out" />
      <Figure label="Net" amountMinor={totals.netMinor} tone="auto" />
    </section>
  );
}

function Figure({
  label,
  amountMinor,
  tone,
}: {
  label: string;
  amountMinor: bigint;
  tone: 'in' | 'out' | 'auto';
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="text-lg font-semibold">
        <MoneyText
          amountMinor={amountMinor}
          currency={WORKSPACE.currency}
          locale={WORKSPACE.locale}
          tone={tone}
        />
      </span>
    </div>
  );
}
