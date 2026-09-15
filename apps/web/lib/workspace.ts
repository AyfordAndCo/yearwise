/**
 * Temporary workspace settings.
 *
 * Phase 1 reads these from the `Workspace` row, editable on `/settings`
 * (FEAT-ACC-02). Until auth and the database land they are constants, so that
 * no component hardcodes a currency or a locale of its own - the wiring point
 * is one file, not every screen.
 */
export const WORKSPACE = {
  name: 'Ayford Household',
  /** ISO-4217. One reporting currency per workspace (D5). */
  currency: 'ZAR',
  locale: 'en-ZA',
} as const;
