import { EmptyState } from '@yearwise/ui';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';

export default function CategoriesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Categories"
        description="The two-level tree every breakdown and report is built on."
      />
      <EmptyState
        variant="no-data"
        title="Categories are not built yet"
        description="They arrive with FEAT-FIN-02. The tree is seeded with the workspace."
      />
    </PageContainer>
  );
}
