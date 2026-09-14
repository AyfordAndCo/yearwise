import { Card } from '@yearwise/ui';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
        <p className="text-muted">
          Authentication is wired in Phase 0 step 6 (Supabase Auth). This page is a placeholder.
        </p>
      </Card>
    </main>
  );
}
