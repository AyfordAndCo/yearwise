import { EmptyState } from '@yearwise/ui';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';

export default function DashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Income, expenses and net for the selected period."
      />
      <EmptyState
        variant="no-data"
        title="The cash-flow dashboard is not built yet"
        description="It arrives with FEAT-FIN-04, after the ledger. Accounts is the screen that works today."
      />
    </PageContainer>
  );
}
