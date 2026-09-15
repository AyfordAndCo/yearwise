'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/nav';

export interface NavLinksProps {
  /** `vertical` for the sidebar, `horizontal` for the compact header row. */
  orientation?: 'vertical' | 'horizontal';
}

/**
 * The navigation, shared by the sidebar and the compact top-bar row.
 *
 * The active item is marked with `aria-current="page"`, not only a colour, so
 * the current location survives for a user who cannot see the highlight.
 */
export function NavLinks({ orientation = 'vertical' }: NavLinksProps) {
  const pathname = usePathname();
  const isVertical = orientation === 'vertical';

  return (
    <nav
      aria-label="Main"
      className={isVertical ? 'flex flex-col gap-1' : 'flex gap-1 overflow-x-auto'}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'rounded-md px-3 py-2 text-sm transition-colors',
              active ? 'bg-tint font-semibold text-primary' : 'text-muted hover:text-foreground',
              isVertical ? '' : 'whitespace-nowrap',
            ].join(' ')}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
