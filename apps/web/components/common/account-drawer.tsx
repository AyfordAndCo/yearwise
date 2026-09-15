'use client';

import { useEffect, useState } from 'react';
import { Button, DateField, Drawer, FormField, Input, Select } from '@yearwise/ui';
import {
  MoneyParseError,
  isDebtAccount,
  minorUnitScale,
  openingBalanceMinorFromInput,
  parseMoney,
  todayIso,
} from '@yearwise/logic';
import type { AccountKind } from '@yearwise/logic';
import { ACCOUNT_TYPE_OPTIONS } from '@/lib/account-types';
import type { AccountInput, AccountView } from '@/lib/accounts-store';
import { WORKSPACE } from '@/lib/workspace';

export interface AccountDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing, absent when creating. */
  account?: AccountView | undefined;
  onSubmit: (input: AccountInput) => void;
}

/** Minor units to a plain decimal string, for a text input. */
function toInputText(amountMinor: bigint, currency: string): string {
  const scale = minorUnitScale(currency);
  const negative = amountMinor < 0n;
  const absolute = negative ? -amountMinor : amountMinor;
  const divisor = 10n ** BigInt(scale);
  const whole = absolute / divisor;
  const fraction = absolute % divisor;

  const body =
    scale === 0
      ? whole.toString()
      : `${whole.toString()}.${fraction.toString().padStart(scale, '0')}`;

  return negative ? `-${body}` : body;
}

const MINUS = '\u2212';

/**
 * Create and edit share one surface, so the fields cannot diverge.
 *
 * The opening balance is the interesting field. `parseMoney` rejects a typed
 * sign by design - sign comes from `kind` on a transaction - so this drawer
 * owns the sign itself:
 *
 *   - a debt account asks for the **amount owed**, a positive magnitude, and
 *     stores it negative, matching the display flip;
 *   - an asset account may be overdrawn, so a leading minus is accepted.
 */
export function AccountDrawer({ open, onClose, account, onSubmit }: AccountDrawerProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountKind>('CURRENT');
  const [balanceText, setBalanceText] = useState('0');
  const [openingDate, setOpeningDate] = useState(todayIso);
  const [includeInNetWorth, setIncludeInNetWorth] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; balance?: string }>({});

  const isEditing = account !== undefined;
  const debt = isDebtAccount(type);

  // Reset whenever the drawer opens, so a cancelled edit never leaks into the
  // next one.
  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? '');
    setType(account?.type ?? 'CURRENT');
    setIncludeInNetWorth(account?.includeInNetWorth ?? true);
    setOpeningDate(account?.openingDate ?? todayIso());
    setBalanceText(
      account === undefined
        ? '0'
        : toInputText(
            isDebtAccount(account.type) ? -account.openingBalanceMinor : account.openingBalanceMinor,
            WORKSPACE.currency,
          ),
    );
    setErrors({});
  }, [open, account]);

  const handleSubmit = () => {
    const nextErrors: { name?: string; balance?: string } = {};

    if (name.trim() === '') {
      nextErrors.name = 'Give the account a name';
    }

    const trimmed = balanceText.trim();
    const typedNegative = trimmed.startsWith('-') || trimmed.startsWith(MINUS);

    let openingBalanceMinor = 0n;

    if (debt && typedNegative) {
      nextErrors.balance = 'Enter the amount owed as a positive number';
    } else {
      try {
        const magnitude = parseMoney(typedNegative ? trimmed.slice(1) : trimmed, WORKSPACE.currency, {
          allowZero: true,
        });
        const signed = typedNegative ? -magnitude : magnitude;
        // The debt-vs-asset sign rule lives in packages/logic, where it is
        // tested. This drawer only handles the text and the optional minus.
        openingBalanceMinor = openingBalanceMinorFromInput(signed, type);
      } catch (error) {
        nextErrors.balance =
          error instanceof MoneyParseError ? error.message : 'Enter a valid amount';
      }
    }

    setErrors(nextErrors);
    if (nextErrors.name !== undefined || nextErrors.balance !== undefined) return;

    onSubmit({
      name: name.trim(),
      type,
      openingBalanceMinor,
      openingDate,
      includeInNetWorth,
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit account' : 'New account'}
      description={
        isEditing
          ? 'Changing the type changes the display sign and the net-worth treatment.'
          : 'A place your money sits.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{isEditing ? 'Save changes' : 'Create account'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Name" error={errors.name} required>
          {(field) => (
            <Input
              {...field}
              value={name}
              autoFocus={!isEditing}
              onChange={(event) => setName(event.target.value)}
              placeholder="Main Cheque Account"
            />
          )}
        </FormField>

        <FormField label="Type" hint="Decides the display sign and the net-worth treatment">
          {(field) => (
            <Select
              {...field}
              value={type}
              options={[...ACCOUNT_TYPE_OPTIONS]}
              onChange={(event) => setType(event.target.value as AccountKind)}
            />
          )}
        </FormField>

        <FormField
          label={debt ? 'Amount owed' : 'Opening balance'}
          error={errors.balance}
          hint={
            debt
              ? 'What you owe today. It is stored negative, and shown as owed.'
              : 'What the account held before you started. May be negative if it is overdrawn.'
          }
        >
          {(field) => (
            <Input
              {...field}
              value={balanceText}
              inputMode="decimal"
              onChange={(event) => setBalanceText(event.target.value)}
            />
          )}
        </FormField>

        <FormField
          label="Opening date"
          hint="Older transactions are still allowed — this is an advisory, not a rule."
        >
          {(field) => (
            <DateField {...field} value={openingDate} onValueChange={setOpeningDate} />
          )}
        </FormField>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeInNetWorth}
            onChange={(event) => setIncludeInNetWorth(event.target.checked)}
          />
          Include in net worth
        </label>
      </div>
    </Drawer>
  );
}
