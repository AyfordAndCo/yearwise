import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { toAccountView } from '@/lib/account-mapper';
import { listAccounts } from '@/lib/server/accounts';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { WorkspaceProvider } from '@/lib/workspace-store';

// Accounts are read per request; the shell must not be cached.
export const dynamic = 'force-dynamic';

/**
 * The authenticated route group.
 *
 * The URL is unaffected by the group name, so `/dashboard` and `/accounts`
 * keep their paths. The frame lives here, once, rather than in each screen.
 *
 * Accounts are loaded here because the sidebar shows net worth on every screen;
 * loading them per screen would be the same query issued more often.
 *
 * When FEAT-ACC-01 lands, the session check belongs in this layout so no screen
 * has to remember it.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [workspace, accounts] = await Promise.all([getActiveWorkspace(), listAccounts()]);

  return (
    <WorkspaceProvider>
      <AppShell
        accounts={accounts.map(toAccountView)}
        currency={workspace.currency}
        locale={workspace.locale}
      >
        {children}
      </AppShell>
    </WorkspaceProvider>
  );
}
