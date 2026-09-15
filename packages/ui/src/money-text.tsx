'use client';

import { formatMoney } from '@yearwise/logic';
import type { CurrencyCode } from '@yearwise/logic';
import type { HTMLAttributes } from 'react';
import { useTheme } from './theme';

/** Account types whose stored balance is displayed flipped (glossary section 3). */
export type MoneyAccountType = 'CURRENT' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'LOAN';

/**
 * `auto` derives the tone from the displayed sign. The explicit values exist so
 * a caller can render a positive figure with the expense treatment, which the
 * dashboard needs for a negative net.
 */
export type MoneyTone = 'auto' | 'neutral' | 'in' | 'out';

export interface MoneyTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Minor units. Signed: positive is money in (A2). */
  amountMinor: bigint;
  currency: CurrencyCode;
  locale?: string;
  /** Debt types display flipped, so a card you owe on reads as "owed". */
  accountType?: MoneyAccountType;
  tone?: MoneyTone;
  /** Prefix a `+` on positive amounts. Negative always carries its sign. */
  showSign?: boolean;
  /** Append " owed" for debt accounts. */
  owed?: boolean;
}

function autoTone(amountMinor: bigint): Exclude<MoneyTone, 'auto'> {
  if (amountMinor > 0n) return 'in';
  if (amountMinor < 0n) return 'out';
  return 'neutral';
}

/**
 * The only sanctioned way to render money.
 *
 * Owns three rules so no screen re-implements them:
 *   1. Formatting goes through `formatMoney`; a component never touches
 *      `Intl`, `toFixed` or `toLocaleString` directly.
 *   2. Debt balances display flipped and read as an amount owed.
 *   3. Sign and colour travel together - a minus sign plus the expense tone, so
 *      direction survives for a user who cannot distinguish the two colours.
 */
export function MoneyText({
  amountMinor,
  currency,
  locale = 'en-ZA',
  accountType,
  tone = 'auto',
  showSign = false,
  owed = false,
  style,
  ...rest
}: MoneyTextProps) {
  const { colours } = useTheme();

  const isDebt = accountType === 'CREDIT_CARD' || accountType === 'LOAN';
  const displayedMinor = isDebt ? -amountMinor : amountMinor;
  const resolvedTone = tone === 'auto' ? autoTone(displayedMinor) : tone;

  // formatMoney emits a hyphen; typography requires the minus sign U+2212.
  let text = formatMoney(displayedMinor, currency, locale).replace('-', '\u2212');
  if (showSign && displayedMinor > 0n) {
    text = `+${text}`;
  }
  if (owed && isDebt) {
    text = `${text} owed`;
  }

  const colour =
    resolvedTone === 'in'
      ? colours.moneyIn
      : resolvedTone === 'out'
        ? colours.moneyOut
        : colours.foreground;

  // Spell the direction out for assistive technology, because a lone minus
  // sign is easy to miss when read aloud.
  const direction = resolvedTone === 'out' ? 'out' : resolvedTone === 'in' ? 'in' : '';
  const ariaLabel = direction === '' ? undefined : `${text}, ${direction}`;

  return (
    <span
      {...rest}
      aria-label={ariaLabel}
      style={{
        fontVariantNumeric: 'tabular-nums lining-nums',
        color: colour,
        ...style,
      }}
    >
      {text}
    </span>
  );
}
