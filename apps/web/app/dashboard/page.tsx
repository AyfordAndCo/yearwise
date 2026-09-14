import { Card } from '@yearwise/ui';

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md text-center">
        <h1 className="mb-2 text-xl font-semibold">Dashboard</h1>
        <p className="text-muted">
          Protected route. Unauthenticated requests will redirect to <code>/login</code> once
          Supabase Auth lands in Phase 0 step 6.
        </p>
      </Card>
    </main>
  );
}
