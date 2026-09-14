/**
 * Money.
 *
 * Every monetary value in Yearwise is an integer count of minor units held in
 * a bigint. There is no float anywhere on the path, and there will not be.
 *
 * See docs/00-product/decisions.md A1 and docs/01-architecture/data-model.md
 * section 5. The rules this file implements are specified in
 * docs/03-features/feat-fin-03-transaction-ledger.md.
 *
 * Two separators are accepted on input because the product is locale-neutral
 * in storage but not in usage: "1,234.56" (en-US) and "1 234,56" (en-ZA, de-DE)
 * both mean 123456 minor units.
 */

/** ISO-4217 alphabetic currency code, e.g. "ZAR", "USD", "KWD". */
export type CurrencyCode = string;

/** Raised for every rejected money input. The message is user-facing copy. */
export class MoneyParseError extends Error {
  override readonly name = 'MoneyParseError';

  constructor(
    message: string,
    readonly input: string,
  ) {
    super(message);
  }
}

/** Upper bound on a single amount, in minor units. A typo guard, not a business rule. */
export const MAX_AMOUNT_MINOR = 10n ** 15n;

const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG',
  'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);
const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);
const FOUR_DECIMAL = new Set(['CLF', 'UYW']);

/**
 * Number of decimal places for a currency.
 *
 * Defaults to 2. The three- and four-decimal lists are closed and small; if a
 * currency is missing, its default will silently be wrong, so the list is
 * asserted in tests.
 */
export function minorUnitScale(currency: CurrencyCode): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  if (FOUR_DECIMAL.has(code)) return 4;
  return 2;
}

/** 10 ** n as a bigint. */
export function powerOfTen(n: number): bigint {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('powerOfTen expects a non-negative integer');
  }
  return 10n ** BigInt(n);
}

/** True when the code is a known currency of a non-standard scale. */
export function isNonStandardScale(currency: CurrencyCode): boolean {
  const code = currency.toUpperCase();
  return ZERO_DECIMAL.has(code) || THREE_DECIMAL.has(code) || FOUR_DECIMAL.has(code);
}

const WHITESPACE = /[\s\u00a0\u202f\u2009]/g;
const DIGITS_AND_SEPARATORS = /^[0-9.,]+$/;

export interface ParseMoneyOptions {
  /**
   * Phase 1 rejects a zero-amount transaction, because a zero is not a fact
   * worth recording. Imports (Phase 8) will need to accept them.
   */
  readonly allowZero?: boolean;
}

/**
 * Parse user input into minor units.
 *
 * Separator resolution, in order:
 *   1. Whitespace is always a thousands separator, never a decimal point. It
 *      is stripped first; the remaining separators decide the rest.
 *   2. When both "." and "," appear, the last one is the decimal separator and
 *      the other is the thousands separator. Unambiguous.
 *   3. A repeated separator ("1.234.567") is a thousands separator.
 *   4. A lone "." or "," is a decimal separator. It is never guessed to be a
 *      thousands separator, because "12.345" cannot be told apart from
 *      "12,345" by its digits alone. The spec resolves the ambiguity in favour
 *      of decimal: "12.345" is rejected for a two-decimal currency, not read
 *      as twelve thousand (feat-fin-03).
 *   5. Thousands groups are validated: the first group is one to three digits
 *      and every following group is exactly three.
 *   6. More precision than the currency allows is rejected, never rounded.
 *
 * @throws {MoneyParseError} for any input that cannot be read unambiguously.
 */
export function parseMoney(
  input: string,
  currency: CurrencyCode,
  options: ParseMoneyOptions = {},
): bigint {
  const scale = minorUnitScale(currency);
  const cleaned = input.trim().replace(WHITESPACE, '');
  const reject = (message: string): never => {
    throw new MoneyParseError(message, input);
  };

  if (cleaned === '') return reject('Enter an amount');
  if (!DIGITS_AND_SEPARATORS.test(cleaned)) return reject('Enter a number');

  const dotCount = cleaned.length - cleaned.replace(/\./g, '').length;
  const commaCount = cleaned.length - cleaned.replace(/,/g, '').length;

  let decimalSep: '.' | ',' | null;
  let thousandsSep: '.' | ',' | null = null;

  if (dotCount > 0 && commaCount > 0) {
    // Both present: the last one is the decimal separator.
    decimalSep = cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',') ? '.' : ',';
    thousandsSep = decimalSep === '.' ? ',' : '.';
  } else if (dotCount >= 2) {
    thousandsSep = '.';
    decimalSep = null;
  } else if (commaCount >= 2) {
    thousandsSep = ',';
    decimalSep = null;
  } else if (dotCount === 1) {
    decimalSep = '.';
  } else if (commaCount === 1) {
    decimalSep = ',';
  } else {
    decimalSep = null;
  }

  const cut = decimalSep === null ? -1 : cleaned.lastIndexOf(decimalSep);
  const rawIntegerPart = cut === -1 ? cleaned : cleaned.slice(0, cut);
  const rawFractionPart = cut === -1 ? '' : cleaned.slice(cut + 1);

  if (!/^[0-9]*$/.test(rawFractionPart)) return reject('Enter a number');

  if (rawFractionPart.length > scale) {
    return reject(
      scale === 0
        ? `${currency.toUpperCase()} has no decimal places`
        : `${currency.toUpperCase()} allows at most ${scale} decimal place${scale === 1 ? '' : 's'}`,
    );
  }

  let integerDigits: string;
  if (thousandsSep === null) {
    if (!/^[0-9]*$/.test(rawIntegerPart)) return reject('Enter a number');
    integerDigits = rawIntegerPart;
  } else {
    const groups = rawIntegerPart.split(thousandsSep);
    const first = groups[0];
    if (first === undefined || !/^[0-9]{1,3}$/.test(first)) return reject('Enter a number');
    for (let index = 1; index < groups.length; index += 1) {
      if (groups[index]!.length !== 3) return reject('Enter a number');
    }
    integerDigits = groups.join('');
  }

  if (integerDigits === '' && rawFractionPart === '') return reject('Enter an amount');

  const fractionDigits = rawFractionPart.padEnd(scale, '0');
  const integerValue = integerDigits === '' ? 0n : BigInt(integerDigits);
  const fractionValue = fractionDigits === '' ? 0n : BigInt(fractionDigits);
  const amountMinor = integerValue * powerOfTen(scale) + fractionValue;

  if (amountMinor > MAX_AMOUNT_MINOR) return reject('That amount is too large');
  if (amountMinor === 0n && options.allowZero !== true) return reject('Enter an amount above zero');

  return amountMinor;
}

/**
 * Format minor units for display.
 *
 * Locale-aware for grouping, decimal separator and currency symbol placement,
 * and exact for values far beyond what a float can represent, because the
 * integer part is formatted by Intl from a bigint rather than converted to a
 * number first.
 */
const NUMERIC_PART_TYPES = new Set(['integer', 'group', 'decimal', 'fraction']);

export function formatMoney(
  amountMinor: bigint,
  currency: CurrencyCode,
  locale = 'en-ZA',
): string {
  const scale = minorUnitScale(currency);
  const negative = amountMinor < 0n;
  const absolute = negative ? -amountMinor : amountMinor;

  const divisor = powerOfTen(scale);
  const whole = absolute / divisor;
  const fraction = absolute % divisor;

  // The integer part is formatted from a bigint, so values beyond 2^53 lose
  // nothing on the way to the screen.
  const wholeText = new Intl.NumberFormat(locale, { useGrouping: true }).format(whole);
  const fractionText = scale === 0 ? '' : fraction.toString().padStart(scale, '0');

  // Discover this locale's symbol placement and separators from a zero-value
  // template, then substitute the exact numeric text for the numeric run.
  const template = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: scale,
    maximumFractionDigits: scale,
  }).formatToParts(0);

  let prefix = '';
  let suffix = '';
  let decimalSeparator = '.';
  let index = 0;

  while (index < template.length && !NUMERIC_PART_TYPES.has(template[index]!.type)) {
    prefix += template[index]!.value;
    index += 1;
  }
  while (index < template.length && NUMERIC_PART_TYPES.has(template[index]!.type)) {
    if (template[index]!.type === 'decimal') decimalSeparator = template[index]!.value;
    index += 1;
  }
  while (index < template.length) {
    suffix += template[index]!.value;
    index += 1;
  }

  const numericText =
    scale === 0 ? wholeText : `${wholeText}${decimalSeparator}${fractionText}`;

  // The sign is prepended rather than taken from the template, because the
  // zero-value template has no sign and sign placement varies by locale.
  return `${negative ? '-' : ''}${prefix}${numericText}${suffix}`;
}

/** Sum of minor amounts. Empty input sums to zero. */
export function sumMinor(values: readonly bigint[]): bigint {
  let total = 0n;
  for (const value of values) total += value;
  return total;
}

export function negateMinor(amountMinor: bigint): bigint {
  return -amountMinor;
}

export function absMinor(amountMinor: bigint): bigint {
  return amountMinor < 0n ? -amountMinor : amountMinor;
}

export function isZeroMinor(amountMinor: bigint): boolean {
  return amountMinor === 0n;
}

export type RoundingMode = 'halfAwayFromZero' | 'halfToEven' | 'floor' | 'ceil' | 'truncate';

/**
 * Multiply an amount by a percentage expressed in basis points.
 *
 * 1950 basis points is 19.50%. Rounding is explicit and required, because
 * interest, budget rollover and debt payoff all round differently.
 */
export function multiplyByBasisPoints(
  amountMinor: bigint,
  basisPoints: bigint,
  mode: RoundingMode = 'halfAwayFromZero',
): bigint {
  if (!Number.isInteger(Number(basisPoints))) {
    throw new TypeError('basisPoints must be an integer');
  }
  return divideRounded(amountMinor * basisPoints, 10_000n, mode);
}

/** Divide with an explicit rounding mode. Denominator must be positive. */
export function divideRounded(
  numerator: bigint,
  denominator: bigint,
  mode: RoundingMode = 'halfAwayFromZero',
): bigint {
  if (denominator <= 0n) throw new RangeError('denominator must be positive');

  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n) return quotient;

  const negative = numerator < 0n;
  const absoluteRemainder = negative ? -remainder : remainder;
  const doubled = absoluteRemainder * 2n;
  const sign = negative ? -1n : 1n;

  switch (mode) {
    case 'truncate':
      return quotient;
    case 'floor':
      return negative ? quotient - 1n : quotient;
    case 'ceil':
      return negative ? quotient : quotient + 1n;
    case 'halfToEven': {
      if (doubled > denominator) return quotient + sign;
      if (doubled < denominator) return quotient;
      return quotient % 2n === 0n ? quotient : quotient + sign;
    }
    case 'halfAwayFromZero':
    default:
      return doubled >= denominator ? quotient + sign : quotient;
  }
}

/**
 * Split a total into parts proportional to weights, with no minor unit lost
 * and no part off by more than one unit.
 *
 * Used by the cash-flow dashboard so that category percentages sum to exactly
 * 100.0 rather than 99.9. Largest-remainder allocation.
 */
export function allocateProportionally(
  totalMinor: bigint,
  weights: readonly bigint[],
): bigint[] {
  if (weights.length === 0) return [];
  const totalWeight = sumMinor(weights);
  if (totalWeight === 0n) return weights.map(() => 0n);

  const sign = totalMinor < 0n ? -1n : 1n;
  const absoluteTotal = absMinor(totalMinor);

  const base: bigint[] = [];
  const remainders: { index: number; remainder: bigint }[] = [];
  let assigned = 0n;

  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index] ?? 0n;
    const numerator = absoluteTotal * weight;
    const share = numerator / totalWeight;
    base.push(share);
    remainders.push({ index, remainder: numerator % totalWeight });
    assigned += share;
  }

  let leftover = absoluteTotal - assigned;

  remainders.sort((a, b) => {
    if (a.remainder === b.remainder) return a.index - b.index;
    return a.remainder > b.remainder ? -1 : 1;
  });

  for (const { index } of remainders) {
    if (leftover === 0n) break;
    base[index] = (base[index] ?? 0n) + 1n;
    leftover -= 1n;
  }

  return base.map((value) => value * sign);
}

/**
 * A part as a percentage of a whole, to two decimal places.
 *
 * Returns undefined when the whole is zero, so callers are forced to render an
 * em dash rather than NaN.
 */
export function percentageOf(partMinor: bigint, wholeMinor: bigint): number | undefined {
  if (wholeMinor === 0n) return undefined;
  const hundredths = divideRounded(absMinor(partMinor) * 10_000n, absMinor(wholeMinor), 'halfAwayFromZero');
  return Number(hundredths) / 100;
}