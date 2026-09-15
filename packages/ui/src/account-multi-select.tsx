'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { MultiSelect } from './multi-select';
import type { MultiSelectOption } from './multi-select';

export interface AccountOption {
  id: string;
  name: string;
  isArchived?: boolean;
}

export interface AccountMultiSelectProps {
  accounts: ReadonlyArray<AccountOption>;
  value: ReadonlyArray<string>;
  onValueChange: (value: string[]) => void;
  label?: string;
  style?: CSSProperties;
}

/**
 * The ledger's account filter.
 *
 * Archived accounts **are** selectable here, and labelled as such. This is a
 * filter, not a picker for a new transaction: filtering to an archived account
 * is how a user reads its history, which archiving deliberately preserves (A4).
 * The rule that archived accounts are never offered applies to entry forms.
 */
export function AccountMultiSelect({
  accounts,
  value,
  onValueChange,
  label = 'Accounts',
  style,
}: AccountMultiSelectProps) {
  const options = useMemo<MultiSelectOption[]>(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: account.isArchived === true ? `${account.name} (archived)` : account.name,
      })),
    [accounts],
  );

  return (
    <MultiSelect
      label={label}
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="All accounts"
      style={style}
    />
  );
}
