'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  DateField,
  Drawer,
  FormField,
  Input,
  SegmentedControl,
  Select,
} from '@yearwise/ui';
import type { SelectOption } from '@yearwise/ui';
import { MoneyParseError, buildCategoryRows, parseMoney, todayIso } from '@yearwise/logic';
import type { TransactionKind } from '@yearwise/logic';
import { splitSign, toInputText } from '@/lib/money-input';
import { WORKSPACE } from '@/lib/workspace';
import { useWorkspace } from '@/lib/workspace-store';
import type { LedgerEntry, TransactionInput } from '@/lib/workspace-store';

const KIND_OPTIONS = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
];

export interface TransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Values to prefill. Absent for a blank entry. */
  initial?: LedgerEntry | undefined;
  /** `true` saves over `initial`; `false` records a new row, dated today. */
  editing?: boolean;
  onSubmit: (input: TransactionInput) => void;
}

interface FieldErrors {
  amount?: string;
  account?: string;
  category?: string;
  date?: string;
}

/**
 * Entry and editing in one surface.
 *
 * The user types a **positive magnitude**. The sign is derived from `kind` on
 * save, which is what makes invariant I7 a database constraint rather than a
 * convention: there is no way to type a sign here, so there is no way to
 * produce a row whose kind and sign disagree.
 *
 * Each open generates a fresh idempotency key, so a double-clicked save is a
 * no-op returning the first row rather than a duplicate.
 */
export function TransactionDrawer({
  open,
  onClose,
  initial,
  editing = false,
  onSubmit,
}: TransactionDrawerProps) {
  const { accounts, categories } = useWorkspace();

  const [kind, setKind] = useState<TransactionKind>('EXPENSE');
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(todayIso);
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const isEditing = editing;

  const selectableAccounts = accounts.filter(
    (account) => !account.isArchived || account.id === initial?.accountId,
  );

  const categoryOptions = useMemo<SelectOption[]>(() => {
    const eligible = categories.filter((category) => category.type === kind && !category.isArchived);
    return buildCategoryRows(eligible).map((row) => ({
      value: row.category.id,
      // A native select cannot indent, so children are marked with a dash.
      label: row.depth === 1 ? `\u2013 ${row.category.name}` : row.category.name,
    }));
  }, [categories, kind]);

  // Reset whenever the drawer opens, so a cancelled edit never leaks into the
  // next one - and so each open is a distinct idempotency key.
  useEffect(() => {
    if (!open) return;

    const nextKind = initial?.kind ?? 'EXPENSE';
    const eligible = categories.filter(
      (category) => category.type === nextKind && !category.isArchived,
    );

    setKind(nextKind);
    setAmountText(
      initial === undefined ? '' : toInputText(absMinor(initial.amountMinor), WORKSPACE.currency),
    );
    setAccountId(initial?.accountId ?? selectableAccounts[0]?.id ?? '');
    setCategoryId(initial?.categoryId ?? eligible[0]?.id ?? '');
    // A duplicate opens pre-filled but dated today, so it records a new fact
    // rather than back-dating one.
    setDate(editing && initial !== undefined ? initial.date : todayIso());
    setPayee(initial?.payee ?? '');
    setNotes(initial?.notes ?? '');
    setIdempotencyKey(crypto.randomUUID());
    setErrors({});
    // selectableAccounts is derived; the account list identity is enough.
  }, [open, initial, editing, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKindChange = (next: string) => {
    const nextKind = next as TransactionKind;
    setKind(nextKind);

    // The picker is filtered by kind, so a category of the other type can no
    // longer be valid.
    const eligible = categories.filter(
      (category) => category.type === nextKind && !category.isArchived,
    );
    if (!eligible.some((category) => category.id === categoryId)) {
      setCategoryId(eligible[0]?.id ?? '');
    }
  };

  const handleSubmit = () => {
    const nextErrors: FieldErrors = {};
    const { digits, negative } = splitSign(amountText);

    let magnitudeMinor = 0n;

    if (negative) {
      nextErrors.amount = 'Enter an amount above zero';
    } else {
      try {
        // Zero is rejected: a zero-amount transaction is not a fact worth
        // recording (FEAT-FIN-03).
        magnitudeMinor = parseMoney(digits, WORKSPACE.currency);
      } catch (error) {
        nextErrors.amount = error instanceof MoneyParseError ? error.message : 'Enter an amount';
      }
    }

    if (accountId === '') nextErrors.account = 'Choose an account';
    if (categoryId === '') nextErrors.category = 'Choose a category';
    if (date === '') nextErrors.date = 'Choose a date';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      accountId,
      categoryId,
      magnitudeMinor,
      kind,
      date,
      payee: payee.trim() === '' ? null : payee.trim(),
      notes: notes.trim() === '' ? null : notes.trim(),
      idempotencyKey,
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit transaction' : 'New transaction'}
      description={isEditing ? undefined : 'Sign comes from the kind, so you type the amount only.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{isEditing ? 'Save changes' : 'Record it'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Amount" error={errors.amount} hint="A positive amount. Never type a minus.">
          {(field) => (
            <Input
              {...field}
              value={amountText}
              autoFocus={!isEditing}
              inputMode="decimal"
              placeholder="0.00"
              onChange={(event) => setAmountText(event.target.value)}
            />
          )}
        </FormField>

        <FormField label="Kind">
          {(field) => (
            <div id={field.id}>
              <SegmentedControl
                label="Transaction kind"
                options={KIND_OPTIONS}
                value={kind}
                onValueChange={handleKindChange}
              />
            </div>
          )}
        </FormField>

        <FormField label="Account" error={errors.account} required>
          {(field) => (
            <Select
              {...field}
              value={accountId}
              options={selectableAccounts.map((account) => ({
                value: account.id,
                label: account.isArchived ? `${account.name} (archived)` : account.name,
              }))}
              onChange={(event) => setAccountId(event.target.value)}
            />
          )}
        </FormField>

        <FormField
          label="Category"
          error={errors.category}
          hint="Filtered by kind. Uncategorised is always available."
          required
        >
          {(field) => (
            <Select
              {...field}
              value={categoryId}
              options={categoryOptions}
              onChange={(event) => setCategoryId(event.target.value)}
            />
          )}
        </FormField>

        <FormField
          label="Date"
          error={errors.date}
          hint="A calendar date. Future dates are permitted."
          required
        >
          {(field) => <DateField {...field} value={date} onValueChange={setDate} />}
        </FormField>

        <FormField label="Payee">
          {(field) => (
            <Input
              {...field}
              value={payee}
              placeholder="Who was paid"
              onChange={(event) => setPayee(event.target.value)}
            />
          )}
        </FormField>

        <FormField label="Notes">
          {(field) => (
            <Input
              {...field}
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
            />
          )}
        </FormField>
      </div>
    </Drawer>
  );
}

function absMinor(value: bigint): bigint {
  return value < 0n ? -value : value;
}
