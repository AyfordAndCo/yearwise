import { MoneyText } from '@yearwise/ui';
import { netWorthMinor } from '@yearwise/logic';
import { WORKSPACE } from '@/lib/workspace';
import type { AccountView } from '@/lib/workspace-store';
import { NavLinks } from './nav-links';

export interface SidebarProps {
  accounts: readonly AccountView[];
  currency: string;
  locale: string;
}

/**
 * The persistent frame: identity, destinations, and the one figure that answers
 * "where do I stand" from any screen.
 *
 * A server component: the accounts are loaded once by the layout and passed in,
 * so the sidebar costs no client JavaScript beyond the navigation links.
 *
 * Desktop-only for now. The compact navigation in `TopBar` covers narrow
 * viewports; a mobile tab bar is an open question in the design system.
 */
export function Sidebar({ accounts, currency, locale }: SidebarProps) {
  const netWorth = netWorthMinor(
    accounts.map((account) => ({
      balanceMinor: account.balanceMinor,
      includeInNetWorth: account.includeInNetWorth,
      isArchived: account.isArchived,
    })),
  );

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="px-4 py-4">
        <span className="text-sm font-semibold">Yearwise</span>
        <p className="mt-0.5 truncate text-xs text-muted">{WORKSPACE.name}</p>
      </div>

      <div className="flex-1 px-2">
        <NavLinks />
      </div>

      <div className="border-t border-border px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Net worth</span>
        <div className="mt-1 text-lg font-semibold">
          <MoneyText amountMinor={netWorth} currency={currency} locale={locale} />
        </div>
      </div>
    </aside>
  );
}
