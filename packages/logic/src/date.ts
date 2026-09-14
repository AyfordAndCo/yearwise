/**
 * Calendar dates.
 *
 * A transaction on the 3rd happened on the 3rd, in every timezone. These
 * helpers therefore work on naive calendar dates - "YYYY-MM-DD" strings - and
 * never on instants.
 *
 * The arithmetic uses Date.UTC internally purely as a day counter. Because
 * both ends are UTC, daylight saving cannot shift a single day, which is the
 * bug this module exists to make impossible.
 *
 * See docs/00-product/decisions.md A6.
 */

/** A calendar date in ISO form: "YYYY-MM-DD". Not an instant, no timezone. */
export type IsoDate = string;

/** Day of week, 0 = Sunday through 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 86_400_000;

export interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Days in a month. Month is 1-based: 1 is January, 12 is December. */
export function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) throw new RangeError(`month out of range: ${month}`);
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/** Validate and split an ISO date. Throws on anything malformed. */
export function parseIsoDate(date: IsoDate): DateParts {
  const match = ISO_DATE_PATTERN.exec(date);
  if (match === null) throw new RangeError(`not an ISO date: ${date}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) throw new RangeError(`month out of range: ${date}`);
  if (day < 1 || day > daysInMonth(year, month)) throw new RangeError(`day out of range: ${date}`);

  return { year, month, day };
}

/** Build a validated ISO date. */
export function toIsoDate(year: number, month: number, day: number): IsoDate {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError(`year out of range: ${year}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month out of range: ${month}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`day out of range: ${day}`);
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isIsoDate(value: string): boolean {
  try {
    parseIsoDate(value);
    return true;
  } catch {
    return false;
  }
}

function toUtcMillis(date: IsoDate): number {
  const { year, month, day } = parseIsoDate(date);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMillis(millis: number): IsoDate {
  const value = new Date(millis);
  return toIsoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
}

/** Today as a calendar date, taken from local time. */
export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(date: IsoDate, days: number): IsoDate {
  if (!Number.isInteger(days)) throw new RangeError('days must be an integer');
  return fromUtcMillis(toUtcMillis(date) + days * MILLISECONDS_PER_DAY);
}

/**
 * Add months, clamping the day to the end of the target month.
 *
 * 31 January plus one month is 28 February (29 in a leap year). It is never
 * 3 March, and the day is never skipped.
 */
export function addMonths(date: IsoDate, months: number): IsoDate {
  if (!Number.isInteger(months)) throw new RangeError('months must be an integer');
  const { year, month, day } = parseIsoDate(date);
  return shiftMonths(year, month, day, months);
}

/**
 * Add months while holding a fixed anchor day.
 *
 * This is the recurrence rule's month-end behaviour: a rule anchored to the
 * 31st fires on 30 April and 28 February, and returns to the 31st in March
 * when the month is long enough. Anchor is deliberately remembered rather than
 * drifting down to 28 permanently.
 */
export function addMonthsWithAnchor(date: IsoDate, months: number, anchorDay: number): IsoDate {
  if (!Number.isInteger(months)) throw new RangeError('months must be an integer');
  if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) {
    throw new RangeError(`anchorDay out of range: ${anchorDay}`);
  }
  const { year, month } = parseIsoDate(date);
  return shiftMonths(year, month, anchorDay, months);
}

function shiftMonths(year: number, month: number, day: number, months: number): IsoDate {
  const zeroBased = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(zeroBased / 12);
  const targetMonth = (zeroBased % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return toIsoDate(targetYear, targetMonth, targetDay);
}

export function startOfMonth(date: IsoDate): IsoDate {
  const { year, month } = parseIsoDate(date);
  return toIsoDate(year, month, 1);
}

/** Last day of the month, inclusive. */
export function endOfMonth(date: IsoDate): IsoDate {
  const { year, month } = parseIsoDate(date);
  return toIsoDate(year, month, daysInMonth(year, month));
}

/** First day of the following month. This is the exclusive upper bound. */
export function endOfMonthExclusive(date: IsoDate): IsoDate {
  return addMonths(startOfMonth(date), 1);
}

/**
 * A month as a half-open range: start inclusive, endExclusive exclusive.
 *
 * Every date range in the product uses this shape. Writing an inclusive upper
 * bound is the classic source of off-by-one errors in financial reports.
 */
export function monthRange(year: number, month: number): { start: IsoDate; endExclusive: IsoDate } {
  const start = toIsoDate(year, month, 1);
  return { start, endExclusive: endOfMonthExclusive(start) };
}

export function compareIsoDate(a: IsoDate, b: IsoDate): -1 | 0 | 1 {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Whole days from a to b. Negative when b precedes a. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtcMillis(b) - toUtcMillis(a)) / MILLISECONDS_PER_DAY);
}

export function weekday(date: IsoDate): Weekday {
  const { year, month, day } = parseIsoDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as Weekday;
}

export function isWeekend(date: IsoDate): boolean {
  const day = weekday(date);
  return day === 0 || day === 6;
}

/** Start of the week containing `date`, for a workspace with the given week start. */
export function startOfWeek(date: IsoDate, weekStartDay: Weekday = 1): IsoDate {
  const offset = (weekday(date) - weekStartDay + 7) % 7;
  return addDays(date, -offset);
}

export function isWithinRange(date: IsoDate, start: IsoDate, endExclusive: IsoDate): boolean {
  return date >= start && date < endExclusive;
}

/** ISO-8601 week numbering: weeks start Monday and week 1 contains 4 January. */
export function isoWeek(date: IsoDate): { year: number; week: number } {
  const { year, month, day } = parseIsoDate(date);
  const thursday = new Date(Date.UTC(year, month - 1, day));
  const mondayBased = (thursday.getUTCDay() + 6) % 7;
  thursday.setUTCDate(thursday.getUTCDate() - mondayBased + 3);

  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstMondayBased = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstMondayBased + 3);

  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * MILLISECONDS_PER_DAY));
  return { year: thursday.getUTCFullYear(), week };
}

/**
 * Period keys for the recurring scheduler.
 *
 * Combined with the recurring rule id, a period key makes materialisation
 * idempotent: a retried job cannot post the same occurrence twice.
 * See docs/01-architecture/data-model.md invariant I9.
 */
export function dailyPeriodKey(date: IsoDate): string {
  parseIsoDate(date);
  return date;
}

export function weeklyPeriodKey(date: IsoDate): string {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function monthlyPeriodKey(date: IsoDate): string {
  const { year, month } = parseIsoDate(date);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

export function quarterlyPeriodKey(date: IsoDate): string {
  const { year, month } = parseIsoDate(date);
  return `${String(year).padStart(4, '0')}-Q${Math.floor((month - 1) / 3) + 1}`;
}

export function annualPeriodKey(date: IsoDate): string {
  const { year } = parseIsoDate(date);
  return String(year).padStart(4, '0');
}

export function formatIsoDateForDisplay(date: IsoDate, locale = 'en-ZA'): string {
  const { year, month, day } = parseIsoDate(date);
  // Anchored at UTC noon so that no timezone offset can roll the date over.
  const instant = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(instant);
}