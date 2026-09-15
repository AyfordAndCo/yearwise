import { AccountsScreen } from '@/components/common/accounts-screen';
import { PageContainer } from '@/components/layout/page-container';
import { toAccountView } from '@/lib/account-mapper';
import { listAccounts } from '@/lib/server/accounts';
import { getActiveWorkspace } from '@/lib/server/workspace';

// Balances are derived per request, from the database.
export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const [workspace, accounts] = await Promise.all([getActiveWorkspace(), listAccounts()]);

  return (
    <PageContainer>
      <AccountsScreen
        initialAccounts={accounts.map(toAccountView)}
        currency={workspace.currency}
        locale={workspace.locale}
      />
    </PageContainer>
  );
}
