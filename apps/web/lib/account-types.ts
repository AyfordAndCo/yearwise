import type { AccountKind } from '@yearwise/logic';

/**
 * Display labels for account types.
 *
 * `CURRENT` is deliberately not "checking": "checking account" is North
 * American (glossary section 3). The label is localised - "Cheque account" for
 * `en-ZA`, "Current account" for `en-GB`.
 */
export const ACCOUNT_TYPE_LABELS: Record<AccountKind, string> = {
  CURRENT: 'Cheque account',
  SAVINGS: 'Savings',
  CREDIT_CARD: 'Credit card',
  CASH: 'Cash',
  LOAN: 'Loan',
};

export const ACCOUNT_TYPE_OPTIONS: ReadonlyArray<{ value: AccountKind; label: string }> = (
  Object.keys(ACCOUNT_TYPE_LABELS) as AccountKind[]
).map((value) => ({ value, label: ACCOUNT_TYPE_LABELS[value] }));
