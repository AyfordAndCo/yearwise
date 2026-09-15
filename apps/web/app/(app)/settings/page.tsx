import { EmptyState } from '@yearwise/ui';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Currency, week start, date format and locale."
      />
      <EmptyState
        variant="no-data"
        title="Settings are not built yet"
        description="They arrive with FEAT-ACC-02, alongside authentication."
      />
    </PageContainer>
  );
}
