import { describe, expect, it } from 'vitest';

import {
  MoneyParseError,
  absMinor,
  allocateProportionally,
  divideRounded,
  formatMoney,
  minorUnitScale,
  multiplyByBasisPoints,
  negateMinor,
  parseMoney,
  percentageOf,
  sumMinor,
} from '../src/money';

/** Strip every non-digit so formatting can be asserted without depending on ICU data. */
const digitsOf = (value: string): string => value.replace(/\D/g, '');

describe('minorUnitScale', () => {
  it('defaults to two decimal places', () => {
    expect(minorUnitScale('ZAR')).toBe(2);
    expect(minorUnitScale('USD')).toBe(2);
  });

  it('knows the zero-decimal currencies', () => {
    expect(minorUnitScale('JPY')).toBe(0);
    expect(minorUnitScale('KRW')).toBe(0);
  });

  it('knows the three-decimal currencies', () => {
    expect(minorUnitScale('KWD')).toBe(3);
    expect(minorUnitScale('BHD')).toBe(3);
  });

  it('is case insensitive', () => {
    expect(minorUnitScale('zar')).toBe(2);
    expect(minorUnitScale('jpy')).toBe(0);
  });
});

describe('parseMoney', () => {
  it('parses the forms a user actually types', () => {
    expect(parseMoney('12.34', 'ZAR')).toBe(1234n);
    expect(parseMoney('12', 'ZAR')).toBe(1200n);
    expect(parseMoney('12.5', 'ZAR')).toBe(1250n);
    expect(parseMoney(' 12.34 ', 'ZAR')).toBe(1234n);
    expect(parseMoney('0.01', 'ZAR')).toBe(1n);
    expect(parseMoney('.5', 'ZAR')).toBe(50n);
  });

  it('tolerates thousands separators in either convention', () => {
    expect(parseMoney('1,234.56', 'ZAR')).toBe(123456n);
    expect(parseMoney('1.234,56', 'ZAR')).toBe(123456n);
    expect(parseMoney('1 234,56', 'ZAR')).toBe(123456n);
    expect(parseMoney('1 234.56', 'ZAR')).toBe(123456n);
  });

  it('treats a lone separator as a decimal point, never a thousands guess', () => {
    expect(() => parseMoney('1,234', 'ZAR')).toThrow(/at most 2 decimal places/);
    expect(() => parseMoney('1.234', 'ZAR')).toThrow(/at most 2 decimal places/);
  });

  it('handles multiple thousands separators', () => {
    expect(parseMoney('1,234,567.89', 'ZAR')).toBe(123456789n);
    expect(parseMoney('1.234.567,89', 'ZAR')).toBe(123456789n);
  });

  it('rejects more precision than the currency allows rather than rounding', () => {
    expect(() => parseMoney('12.345', 'ZAR')).toThrow(MoneyParseError);
    expect(() => parseMoney('12.345', 'ZAR')).toThrow(/at most 2 decimal places/);
    expect(() => parseMoney('12.5', 'JPY')).toThrow(/no decimal places/);
  });

  it('rejects a sign typed into the amount field', () => {
    expect(() => parseMoney('-12.34', 'ZAR')).toThrow(MoneyParseError);
    expect(() => parseMoney('+12.34', 'ZAR')).toThrow(MoneyParseError);
  });

  it('rejects nonsense', () => {
    for (const input of ['', '   ', 'abc', '12.3.4', 'R12', '1e5', 'NaN', 'Infinity']) {
      expect(() => parseMoney(input, 'ZAR'), `expected ${JSON.stringify(input)} to throw`).toThrow(
        MoneyParseError,
      );
    }
  });

  it('rejects zero by default and allows it on request', () => {
    expect(() => parseMoney('0', 'ZAR')).toThrow(/above zero/);
    expect(() => parseMoney('0.00', 'ZAR')).toThrow(/above zero/);
    expect(parseMoney('0', 'ZAR', { allowZero: true })).toBe(0n);
  });

  it('rejects amounts beyond the guard rail', () => {
    expect(() => parseMoney('99999999999999999', 'ZAR')).toThrow(/too large/);
  });

  it('honours a three-decimal currency', () => {
    expect(parseMoney('12.345', 'KWD')).toBe(12345n);
    expect(parseMoney('12.3', 'KWD')).toBe(12300n);
    expect(() => parseMoney('12.3456', 'KWD')).toThrow(MoneyParseError);
  });

  it('honours a zero-decimal currency', () => {
    expect(parseMoney('1200', 'JPY')).toBe(1200n);
    expect(parseMoney('1,200,000', 'JPY')).toBe(1200000n);
    expect(() => parseMoney('1,200', 'JPY')).toThrow(/no decimal places/);
  });

  it('reports the offending input on the error', () => {
    try {
      parseMoney('abc', 'ZAR');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(MoneyParseError);
      expect((error as MoneyParseError).input).toBe('abc');
    }
  });
});

describe('the acceptance criterion that motivated this module', () => {
  it('adds 0.01 ten times to exactly 0.10', () => {
    const cents = Array.from({ length: 10 }, () => parseMoney('0.01', 'ZAR'));
    expect(sumMinor(cents)).toBe(10n);
    expect(sumMinor(cents)).toBe(parseMoney('0.10', 'ZAR'));
  });

  it('does not drift over ten thousand entries', () => {
    const parts = Array.from({ length: 10_000 }, () => parseMoney('0.07', 'ZAR'));
    expect(sumMinor(parts)).toBe(70_000n);
    expect(sumMinor(parts)).toBe(parseMoney('700.00', 'ZAR'));
  });
});

describe('formatMoney', () => {
  it('renders the correct digits regardless of locale', () => {
    expect(digitsOf(formatMoney(123456n, 'ZAR', 'en-ZA'))).toBe('123456');
    expect(digitsOf(formatMoney(123456n, 'USD', 'en-US'))).toBe('123456');
    expect(digitsOf(formatMoney(123456n, 'EUR', 'de-DE'))).toBe('123456');
    expect(digitsOf(formatMoney(10000000000n, 'ZAR', 'en-ZA'))).toBe('10000000000');
  });

  it('signals negative amounts', () => {
    expect(formatMoney(-1234n, 'ZAR', 'en-ZA').startsWith('-')).toBe(true);
    expect(formatMoney(1234n, 'ZAR', 'en-ZA').startsWith('-')).toBe(false);
  });

  it('renders a zero-decimal currency with no decimal part', () => {
    expect(digitsOf(formatMoney(1200n, 'JPY', 'ja-JP'))).toBe('1200');
  });

  it('renders a three-decimal currency with three digits', () => {
    expect(digitsOf(formatMoney(12345n, 'KWD', 'en-GB'))).toBe('12345');
  });

  it('does not lose precision beyond the safe integer range', () => {
    const huge = 9_007_199_254_740_993n;
    const formatted = formatMoney(huge, 'ZAR', 'en-ZA');
    expect(digitsOf(formatted)).toBe('9007199254740993');
  });

  it('round trips through parseMoney for the digits', () => {
    for (const amount of [1n, 99n, 1234n, 100000n, 999999999n]) {
      const rendered = formatMoney(amount, 'ZAR', 'en-ZA');
      expect(digitsOf(rendered)).toBe(amount.toString().padStart(3, '0'));
    }
  });
});

describe('small helpers', () => {
  it('sums and negates', () => {
    expect(sumMinor([])).toBe(0n);
    expect(sumMinor([1n, 2n, 3n])).toBe(6n);
    expect(negateMinor(5n)).toBe(-5n);
    expect(absMinor(-5n)).toBe(5n);
    expect(absMinor(5n)).toBe(5n);
  });
});

describe('divideRounded', () => {
  it('rounds half away from zero by default', () => {
    expect(divideRounded(5n, 10n)).toBe(1n);
    expect(divideRounded(-5n, 10n)).toBe(-1n);
    expect(divideRounded(4n, 10n)).toBe(0n);
    expect(divideRounded(-4n, 10n)).toBe(0n);
    expect(divideRounded(15n, 10n)).toBe(2n);
  });

  it('supports banker rounding, floor, ceil and truncation', () => {
    expect(divideRounded(5n, 10n, 'halfToEven')).toBe(0n);
    expect(divideRounded(15n, 10n, 'halfToEven')).toBe(2n);
    expect(divideRounded(-1n, 10n, 'floor')).toBe(-1n);
    expect(divideRounded(1n, 10n, 'ceil')).toBe(1n);
    expect(divideRounded(-19n, 10n, 'truncate')).toBe(-1n);
  });

  it('rejects a non-positive denominator', () => {
    expect(() => divideRounded(1n, 0n)).toThrow(RangeError);
  });
});

describe('multiplyByBasisPoints', () => {
  it('treats 10000 basis points as one hundred per cent', () => {
    expect(multiplyByBasisPoints(1234n, 10_000n)).toBe(1234n);
  });

  it('computes a partial percentage', () => {
    expect(multiplyByBasisPoints(10_000n, 1950n)).toBe(1950n);
  });

  it('rounds rather than truncating', () => {
    expect(multiplyByBasisPoints(1n, 5000n)).toBe(1n);
    expect(multiplyByBasisPoints(1n, 4999n)).toBe(0n);
  });
});

describe('allocateProportionally', () => {
  it('never loses or invents a minor unit', () => {
    const parts = allocateProportionally(100n, [1n, 1n, 1n]);
    expect(sumMinor(parts)).toBe(100n);
    expect(parts).toEqual([34n, 33n, 33n]);
  });

  it('allocates one hundred per cent across awkward weights', () => {
    const parts = allocateProportionally(10_000n, [1n, 1n, 1n, 1n, 1n, 1n, 1n]);
    expect(sumMinor(parts)).toBe(10_000n);
  });

  it('copes with a zero total and with all-zero weights', () => {
    expect(allocateProportionally(0n, [1n, 2n])).toEqual([0n, 0n]);
    expect(allocateProportionally(100n, [0n, 0n])).toEqual([0n, 0n]);
    expect(allocateProportionally(100n, [])).toEqual([]);
  });

  it('preserves sign for a negative total', () => {
    const parts = allocateProportionally(-100n, [1n, 1n, 1n]);
    expect(sumMinor(parts)).toBe(-100n);
    expect(parts.every((value) => value <= 0n)).toBe(true);
  });
});

describe('percentageOf', () => {
  it('returns undefined for a zero whole so callers must render a dash', () => {
    expect(percentageOf(100n, 0n)).toBeUndefined();
  });

  it('computes a percentage to two decimal places', () => {
    expect(percentageOf(1n, 4n)).toBe(25);
    expect(percentageOf(1n, 3n)).toBe(33.33);
    expect(percentageOf(2n, 3n)).toBe(66.67);
  });
});