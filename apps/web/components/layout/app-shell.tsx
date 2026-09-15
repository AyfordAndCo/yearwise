import type { ReactNode } from 'react';
import type { AccountView } from '@/lib/workspace-store';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

export interface AppShellProps {
  children: ReactNode;
  accounts: readonly AccountView[];
  currency: string;
  locale: string;
}

/**
 * The frame every authenticated screen renders inside.
 *
 * Owns the nav, the identity, and the content well. It does not own the auth
 * check: that lands with FEAT-ACC-01, and belongs in the layout above this, so
 * no screen has to remember it.
 */
export function AppShell({ children, accounts, currency, locale }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar accounts={accounts} currency={currency} locale={locale} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
