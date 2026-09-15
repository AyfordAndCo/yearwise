import { prisma } from '@yearwise/database';

const DEMO_EMAIL = 'demo@yearwise.local';

export interface ActiveWorkspace {
  id: string;
  currency: string;
  locale: string;
}

/**
 * The workspace the app operates on.
 *
 * **This is the only function that changes when FEAT-ACC-01 lands.** There is no
 * session yet, so the app uses one demo workspace, created on first use. With
 * auth it becomes "the workspace of the signed-in user's membership", and
 * nothing else in the server layer changes.
 *
 * Every table carries `workspaceId` (M1/A9) regardless, so that change is a
 * lookup rather than a migration.
 */
export async function getActiveWorkspace(): Promise<ActiveWorkspace> {
  const existing = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing !== null) {
    return {
      id: existing.id,
      // `currency` is CHAR(3); trim any padding a driver might return.
      currency: existing.currency.trim(),
      locale: existing.locale,
    };
  }

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, displayName: 'Demo user' },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Ayford Household',
      currency: 'ZAR',
      weekStartDay: 1,
      dateFormat: 'DD/MM/YYYY',
      locale: 'en-ZA',
      memberships: { create: { userId: user.id, role: 'OWNER' } },
    },
  });

  return {
    id: workspace.id,
    currency: workspace.currency.trim(),
    locale: workspace.locale,
  };
}
