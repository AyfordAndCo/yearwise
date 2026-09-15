import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { MoneyText } from '../src/money-text';
import { ThemeProvider } from '../src/theme';

/**
 * Assertions deliberately avoid exact formatted strings. `Intl` output for a
 * locale varies with the ICU build, so the logic package asserts digits only
 * and so do we. Everything else here is a rule that must not drift: the minus
 * sign, the debt flip, the tone, and the alignment.
 */
const digitsOf = (value: string | null): string => (value ?? '').replace(/\D/g, '');

function renderMoney(ui: ReactElement) {
  const { container } = render(<ThemeProvider>{ui}</ThemeProvider>);
  const span = container.querySelector('span');
  if (span === null) throw new Error('MoneyText did not render a span');
  return span;
}

const MONEY_IN = 'rgb(30, 132, 73)'; // tokens.colour.light.moneyIn
const MONEY_OUT = 'rgb(192, 57, 43)'; // tokens.colour.light.moneyOut
const FOREGROUND = 'rgb(26, 26, 26)'; // tokens.colour.light.foreground

describe('MoneyText', () => {
  it('renders the digits of the amount', () => {
    const span = renderMoney(<MoneyText amountMinor={2454354n} currency="ZAR" />);
    expect(digitsOf(span.textContent)).toBe('2454354');
  });

  it('applies tabular figures so a column of money aligns', () => {
    const span = renderMoney(<MoneyText amountMinor={1234n} currency="ZAR" />);
    expect(span.style.fontVariantNumeric).toBe('tabular-nums lining-nums');
  });

  it('uses the minus sign U+2212, never a hyphen', () => {
    const span = renderMoney(<MoneyText amountMinor={-2097200n} currency="ZAR" />);
    expect(span.textContent).toContain('\u2212');
    expect(span.textContent).not.toContain('-');
  });

  it('prefixes a plus sign only when asked and only when positive', () => {
    const positive = renderMoney(<MoneyText amountMinor={1234n} currency="ZAR" showSign />);
    expect(positive.textContent?.startsWith('+')).toBe(true);

    const negative = renderMoney(<MoneyText amountMinor={-1234n} currency="ZAR" showSign />);
    expect(negative.textContent?.startsWith('+')).toBe(false);
  });

  it('tones income and expenses apart', () => {
    const income = renderMoney(<MoneyText amountMinor={1234n} currency="ZAR" />);
    expect(income.style.color).toBe(MONEY_IN);

    const expense = renderMoney(<MoneyText amountMinor={-1234n} currency="ZAR" />);
    expect(expense.style.color).toBe(MONEY_OUT);
  });

  it('renders a zero amount neutrally', () => {
    const zero = renderMoney(<MoneyText amountMinor={0n} currency="ZAR" />);
    expect(zero.style.color).toBe(FOREGROUND);
  });

  it('honours an explicit tone over the derived one', () => {
    // The dashboard shows a positive net with the expense treatment.
    const span = renderMoney(<MoneyText amountMinor={1234n} currency="ZAR" tone="out" />);
    expect(span.style.color).toBe(MONEY_OUT);
  });

  it('displays a debt balance flipped, as an amount owed', () => {
    // A credit card you owe on is stored negative (glossary section 3).
    const span = renderMoney(
      <MoneyText amountMinor={-120000n} currency="ZAR" accountType="CREDIT_CARD" owed />,
    );

    expect(digitsOf(span.textContent)).toBe('120000');
    expect(span.textContent).not.toContain('\u2212');
    expect(span.textContent).toContain('owed');
    // Displayed as a positive figure, so it reads in the income tone.
    expect(span.style.color).toBe(MONEY_IN);
  });

  it('leaves a current account unflipped', () => {
    const span = renderMoney(
      <MoneyText amountMinor={-120000n} currency="ZAR" accountType="CURRENT" owed />,
    );

    expect(span.textContent).toContain('\u2212');
    expect(span.textContent).not.toContain('owed');
  });

  it('spells the direction out for assistive technology', () => {
    const expense = renderMoney(<MoneyText amountMinor={-1234n} currency="ZAR" />);
    expect(expense.getAttribute('aria-label')).toContain('out');

    const income = renderMoney(<MoneyText amountMinor={1234n} currency="ZAR" />);
    expect(income.getAttribute('aria-label')).toContain('in');

    const zero = renderMoney(<MoneyText amountMinor={0n} currency="ZAR" />);
    expect(zero.getAttribute('aria-label')).toBeNull();
  });

  it('renders a zero-decimal currency without a fractional part', () => {
    const span = renderMoney(<MoneyText amountMinor={1200n} currency="JPY" />);
    expect(digitsOf(span.textContent)).toBe('1200');
  });

  it('does not lose precision beyond the safe integer range', () => {
    const span = renderMoney(<MoneyText amountMinor={9007199254740993n} currency="ZAR" />);
    expect(digitsOf(span.textContent)).toBe('9007199254740993');
  });
});
