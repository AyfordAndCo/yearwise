import { Card, MoneyText } from '@yearwise/ui';

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <h1 className="mb-2 text-xl font-semibold">Dashboard</h1>
        <p className="mb-4 text-muted">
          Protected route. Unauthenticated requests will redirect to <code>/login</code> once
          Supabase Auth lands in Phase 0 step 6.
        </p>

        {/*
          Phase 0 smoke check: proves the token pipeline and the money pipeline end
          to end (tokens -> MoneyText -> formatMoney in packages/logic). Replaced by
          the real cash-flow dashboard in Phase 1 (FEAT-FIN-04).
        */}
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Income</dt>
            <dd>
              <MoneyText amountMinor={2454354n} currency="ZAR" showSign />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Expenses</dt>
            <dd>
              <MoneyText amountMinor={-2097200n} currency="ZAR" />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Credit card</dt>
            <dd>
              <MoneyText amountMinor={-120000n} currency="ZAR" accountType="CREDIT_CARD" owed />
            </dd>
          </div>
        </dl>
      </Card>
    </main>
  );
}
