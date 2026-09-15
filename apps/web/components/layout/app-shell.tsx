import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

/**
 * The frame every authenticated screen renders inside.
 *
 * Owns the nav, the identity, and the content well. It does not own the auth
 * check: that lands with FEAT-ACC-01, and belongs in this layout when it does,
 * so no screen has to remember it.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
