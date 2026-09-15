/**
 * Date conversion at the Prisma boundary.
 *
 * Prisma maps a `@db.Date` column to a JavaScript `Date` at **UTC midnight**,
 * and expects the same on the way in. Reading local parts, or passing a
 * timestamp, shifts the day for anyone west of UTC - which is the class of bug
 * A6 exists to prevent. Everything below stays in UTC parts.
 */

/** A `@db.Date` column to `YYYY-MM-DD`. */
export function toIsoDateFromPrisma(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** A naive calendar date to the `Date` Prisma expects, at UTC midnight. */
export function fromIsoDateForPrisma(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}
