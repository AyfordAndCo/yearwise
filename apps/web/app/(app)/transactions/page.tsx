import { EmptyState } from '@yearwise/ui';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';

export default function TransactionsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Transactions"
        description="The ledger: record, correct and find what happened."
      />
      <EmptyState
        variant="no-data"
        title="The ledger is not built yet"
        description="It arrives with FEAT-FIN-03, which is the critical path of Phase 1."
      />
    </PageContainer>
  );
}
