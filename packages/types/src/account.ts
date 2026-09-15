import { z } from 'zod';

/**
 * Account API contracts.
 *
 * One schema, three consumers: the route handler validates with it, the client
 * infers its types from it, and the tests assert against it. A form rule and a
 * server rule therefore cannot diverge.
 *
 * Money crosses the boundary as a **string** of minor units (A1, M4). `BigInt`
 * does not survive `JSON.stringify`, so serialisation happens once, at the edge.
 * A bare JSON number is never accepted, because it would have to be a float.
 */

const MINOR_UNITS = /^-?\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const accountTypeSchema = z.enum([
  'CURRENT',
  'SAVINGS',
  'CREDIT_CARD',
  'CASH',
  'LOAN',
]);

/** Signed minor units, as a string. */
export const minorUnitsSchema = z
  .string()
  .regex(MINOR_UNITS, 'Must be an integer number of minor units, as a string');

/** A naive calendar date. Never a timestamp (A6). */
export const isoDateSchema = z.string().regex(ISO_DATE, 'Must be a YYYY-MM-DD calendar date');

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, 'Give the account a name').max(120),
  type: accountTypeSchema,
  openingBalanceMinor: minorUnitsSchema,
  openingDate: isoDateSchema,
  includeInNetWorth: z.boolean(),
});

export const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: accountTypeSchema,
  openingBalanceMinor: minorUnitsSchema,
  openingDate: isoDateSchema,
  includeInNetWorth: z.boolean(),
  isArchived: z.boolean(),
  /** Derived: opening balance plus every transaction. Never stored (I3). */
  balanceMinor: minorUnitsSchema,
});

export const accountListSchema = z.array(accountSchema);

export type AccountTypeDto = z.infer<typeof accountTypeSchema>;
export type AccountInputDto = z.infer<typeof accountInputSchema>;
export type AccountDto = z.infer<typeof accountSchema>;

/** The shape every error response takes, so the client has one thing to parse. */
export const apiErrorSchema = z.object({
  error: z.string(),
  /** Field-level messages, for a form to attach to the right input. */
  fields: z.record(z.string()).optional(),
});

export type ApiErrorDto = z.infer<typeof apiErrorSchema>;
