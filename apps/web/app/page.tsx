import Link from 'next/link';
import { Button, Card } from '@yearwise/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Yearwise</h1>
      <p className="max-w-md text-center text-muted">
        A life operating system for money, budgets, debts, savings, tasks, habits and meals.
      </p>
      <Card className="max-w-sm text-center">
        <p className="text-muted">
          Phase 0 placeholder. The dashboard ships in Phase 1.
        </p>
      </Card>
      <div className="flex gap-3">
        <Link href="/dashboard">
          <Button>Go to dashboard</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Sign in</Button>
        </Link>
      </div>
    </main>
  );
}
