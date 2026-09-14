import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  addMonthsWithAnchor,
  annualPeriodKey,
  compareIsoDate,
  dailyPeriodKey,
  daysBetween,
  daysInMonth,
  endOfMonth,
  endOfMonthExclusive,
  isIsoDate,
  isLeapYear,
  isWithinRange,
  isoWeek,
  monthlyPeriodKey,
  monthRange,
  parseIsoDate,
  quarterlyPeriodKey,
  startOfMonth,
  startOfWeek,
  toIsoDate,
  weekday,
  weeklyPeriodKey,
} from '../src/date';

describe('isLeapYear', () => {
  it('applies the full Gregorian rule', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });
});

describe('daysInMonth', () => {
  it('knows February', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it('knows the thirty-day months', () => {
    for (const month of [4, 6, 9, 11]) expect(daysInMonth(2026, month)).toBe(30);
  });

  it('rejects an impossible month', () => {
    expect(() => daysInMonth(2026, 13)).toThrow(RangeError);
  });
});

describe('parseIsoDate and toIsoDate', () => {
  it('round trips', () => {
    expect(parseIsoDate('2026-03-15')).toEqual({ year: 2026, month: 3, day: 15 });
    expect(toIsoDate(2026, 3, 15)).toBe('2026-03-15');
  });

  it('pads single digits', () => {
    expect(toIsoDate(2026, 1, 5)).toBe('2026-01-05');
  });

  it('rejects malformed and impossible dates', () => {
    for (const value of ['2026-3-15', '15/03/2026', '', '2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10']) {
      expect(isIsoDate(value), `expected ${value} to be rejected`).toBe(false);
    }
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('is unaffected by daylight saving transitions', () => {
    // The United Kingdom springs forward on 2026-03-29 and the United States on
    // 2026-03-08. Neither may shift a calendar day.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });

  it('adds a whole year of days correctly across a leap year', () => {
    expect(addDays('2024-01-01', 366)).toBe('2025-01-01');
    expect(addDays('2025-01-01', 365)).toBe('2026-01-01');
  });
});

describe('addMonths', () => {
  it('clamps to the end of a shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('crosses a year boundary', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2026-06-15', 12)).toBe('2027-06-15');
  });

  it('handles many months at once', () => {
    expect(addMonths('2026-01-31', 13)).toBe('2027-02-28');
  });
});

describe('addMonthsWithAnchor - the recurrence month-end rule', () => {
  it('clamps for short months', () => {
    expect(addMonthsWithAnchor('2026-01-31', 1, 31)).toBe('2026-02-28');
    expect(addMonthsWithAnchor('2026-01-31', 3, 31)).toBe('2026-04-30');
  });

  it('returns to the anchor when the month is long enough again', () => {
    // This is the behaviour a drifting implementation gets wrong: after
    // clamping to 28 February, the March occurrence must be the 31st again,
    // not the 28th.
    expect(addMonthsWithAnchor('2026-01-31', 2, 31)).toBe('2026-03-31');
    expect(addMonthsWithAnchor('2026-02-28', 1, 31)).toBe('2026-03-31');
  });

  it('handles a 30th anchor in February', () => {
    expect(addMonthsWithAnchor('2026-01-30', 1, 30)).toBe('2026-02-28');
    expect(addMonthsWithAnchor('2026-01-30', 2, 30)).toBe('2026-03-30');
  });

  it('rejects an impossible anchor', () => {
    expect(() => addMonthsWithAnchor('2026-01-01', 1, 32)).toThrow(RangeError);
    expect(() => addMonthsWithAnchor('2026-01-01', 1, 0)).toThrow(RangeError);
  });
});

describe('month boundaries', () => {
  it('finds the start and the inclusive end', () => {
    expect(startOfMonth('2026-03-15')).toBe('2026-03-01');
    expect(endOfMonth('2026-03-15')).toBe('2026-03-31');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonth('2024-02-10')).toBe('2024-02-29');
  });

  it('produces a half-open range', () => {
    expect(endOfMonthExclusive('2026-03-15')).toBe('2026-04-01');
    expect(monthRange(2026, 3)).toEqual({ start: '2026-03-01', endExclusive: '2026-04-01' });
    expect(monthRange(2026, 12)).toEqual({ start: '2026-12-01', endExclusive: '2027-01-01' });
  });

  it('includes the last day and excludes the first day of the next month', () => {
    const { start, endExclusive } = monthRange(2026, 3);
    expect(isWithinRange('2026-03-31', start, endExclusive)).toBe(true);
    expect(isWithinRange('2026-04-01', start, endExclusive)).toBe(false);
    expect(isWithinRange('2026-02-28', start, endExclusive)).toBe(false);
    expect(isWithinRange(start, start, endExclusive)).toBe(true);
  });
});

describe('comparison and difference', () => {
  it('compares lexicographically as well as chronologically', () => {
    expect(compareIsoDate('2026-03-01', '2026-03-02')).toBe(-1);
    expect(compareIsoDate('2026-03-02', '2026-03-01')).toBe(1);
    expect(compareIsoDate('2026-03-01', '2026-03-01')).toBe(0);
  });

  it('counts whole days', () => {
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
    expect(daysBetween('2026-03-31', '2026-03-01')).toBe(-30);
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
  });
});

describe('weekday and weeks', () => {
  it('reports the day of week', () => {
    expect(weekday('2026-01-01')).toBe(4);
    expect(weekday('2026-01-04')).toBe(0);
  });

  it('finds the start of the week for a Monday-first workspace', () => {
    expect(startOfWeek('2026-01-01', 1)).toBe('2025-12-29');
    expect(startOfWeek('2026-01-04', 1)).toBe('2025-12-29');
    expect(startOfWeek('2026-01-05', 1)).toBe('2026-01-05');
  });

  it('finds the start of the week for a Sunday-first workspace', () => {
    expect(startOfWeek('2026-01-01', 0)).toBe('2025-12-28');
    expect(startOfWeek('2026-01-04', 0)).toBe('2026-01-04');
  });

  it('numbers ISO weeks correctly', () => {
    expect(isoWeek('2026-01-01')).toEqual({ year: 2026, week: 1 });
    expect(isoWeek('2026-01-04')).toEqual({ year: 2026, week: 1 });
    expect(isoWeek('2026-01-05')).toEqual({ year: 2026, week: 2 });
    // 2027-01-01 is a Friday, so it belongs to the final ISO week of 2026.
    expect(isoWeek('2027-01-01')).toEqual({ year: 2026, week: 53 });
  });
});

describe('period keys for the recurring scheduler', () => {
  it('builds a daily key', () => {
    expect(dailyPeriodKey('2026-03-15')).toBe('2026-03-15');
  });

  it('builds a weekly key', () => {
    expect(weeklyPeriodKey('2026-01-01')).toBe('2026-W01');
    expect(weeklyPeriodKey('2026-01-05')).toBe('2026-W02');
  });

  it('builds a monthly key', () => {
    expect(monthlyPeriodKey('2026-03-15')).toBe('2026-03');
    expect(monthlyPeriodKey('2026-01-01')).toBe('2026-01');
  });

  it('builds a quarterly key', () => {
    expect(quarterlyPeriodKey('2026-01-15')).toBe('2026-Q1');
    expect(quarterlyPeriodKey('2026-03-31')).toBe('2026-Q1');
    expect(quarterlyPeriodKey('2026-04-01')).toBe('2026-Q2');
    expect(quarterlyPeriodKey('2026-12-31')).toBe('2026-Q4');
  });

  it('builds an annual key', () => {
    expect(annualPeriodKey('2026-07-04')).toBe('2026');
  });

  it('is stable for every date inside the same month', () => {
    expect(monthlyPeriodKey('2026-03-01')).toBe(monthlyPeriodKey('2026-03-31'));
  });
});