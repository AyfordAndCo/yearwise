'use client';

import Link from 'next/link';
import { Button } from '@yearwise/ui';
import { WORKSPACE } from '@/lib/workspace';
import { NavLinks } from './nav-links';

/**
 * Identity and the most frequent action, always reachable without navigating
 * first.
 *
 * The workspace menu and sign-out are deliberately absent: there is no second
 * workspace to switch to and no session to end until auth lands, and a control
 * that does nothing is worse than no control.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8">
        <span className="text-sm font-semibold md:hidden">Yearwise</span>
        <span className="hidden text-sm text-muted md:inline">{WORKSPACE.name}</span>

        <Link href="/transactions">
          <Button>New transaction</Button>
        </Link>
      </div>

      <div className="px-2 pb-2 md:hidden">
        <NavLinks orientation="horizontal" />
      </div>
    </header>
  );
}
