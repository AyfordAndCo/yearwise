/**
 * The product's destinations. One list, so the desktop sidebar and the compact
 * navigation cannot disagree about what exists.
 */
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/categories', label: 'Categories' },
  { href: '/settings', label: 'Settings' },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
