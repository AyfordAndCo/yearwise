import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { WorkspaceProvider } from '@/lib/workspace-store';

/**
 * The authenticated route group.
 *
 * The URL is unaffected by the group name, so `/dashboard` and `/accounts`
 * keep their paths. The frame lives here, once, rather than in each screen.
 *
 * When FEAT-ACC-01 lands, the session check belongs in this layout so no screen
 * has to remember it.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
