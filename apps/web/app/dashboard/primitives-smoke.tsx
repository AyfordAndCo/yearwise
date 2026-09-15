'use client';

import { useState } from 'react';
import { DateField, Drawer, EmptyState, FormField, Select, Toast } from '@yearwise/ui';

const ACCOUNT_TYPES = [
  { value: 'CURRENT', label: 'Cheque account' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CREDIT_CARD', label: 'Credit card' },
];

/**
 * Phase 0 scaffolding, deleted when the real screens land.
 *
 * It exists to prove, through the production build rather than by inspection,
 * that the form primitives compose and that the two portal-based primitives
 * (`Drawer`, `Toast`) render safely during server rendering. Both start
 * unmounted and return null on the server; this is what verifies that claim.
 */
export function PrimitivesSmoke() {
  const [accountType, setAccountType] = useState('CURRENT');
  const [openingDate, setOpeningDate] = useState('2026-03-01');

  return (
    <div className="mt-6 flex flex-col gap-4">
      <FormField label="Account type" hint="Affects the display sign" required>
        {(field) => (
          <Select
            {...field}
            value={accountType}
            onChange={(event) => setAccountType(event.target.value)}
            options={ACCOUNT_TYPES}
          />
        )}
      </FormField>

      <FormField label="Opening date">
        {(field) => (
          <DateField {...field} value={openingDate} onValueChange={setOpeningDate} />
        )}
      </FormField>

      <EmptyState
        variant="no-matches"
        title="No transactions match"
        description="Try widening the date range."
      />

      {/* Closed on purpose: proves the portals are server-render safe. */}
      <Drawer open={false} onClose={() => undefined} title="Phase 0 scaffolding">
        {null}
      </Drawer>
      <Toast open={false} onDismiss={() => undefined} title="Phase 0 scaffolding" />
    </div>
  );
}
