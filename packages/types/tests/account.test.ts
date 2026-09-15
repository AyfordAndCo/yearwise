import { describe, expect, it } from 'vitest';
import { accountInputSchema, accountSchema } from '../src/account';

const validInput = {
  name: 'Main Cheque Account',
  type: 'CURRENT',
  openingBalanceMinor: '1248000',
  openingDate: '2026-03-01',
  includeInNetWorth: true,
};

describe('accountInputSchema', () => {
  it('accepts a well-formed account', () => {
    expect(accountInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('accepts a negative opening balance, because an overdrawn account is real', () => {
    expect(
      accountInputSchema.safeParse({ ...validInput, openingBalanceMinor: '-50000' }).success,
    ).toBe(true);
  });

  it('rejects money as a JSON number', () => {
    // A bare number would have to be a float, which is the one thing that must
    // never touch a ledger (A1).
    const result = accountInputSchema.safeParse({ ...validInput, openingBalanceMinor: 1248000 });

    expect(result.success).toBe(false);
  });

  it('rejects a decimal string, because the value is minor units', () => {
    expect(
      accountInputSchema.safeParse({ ...validInput, openingBalanceMinor: '12480.00' }).success,
    ).toBe(false);
  });

  it('rejects a date that is not a naive calendar date', () => {
    expect(
      accountInputSchema.safeParse({ ...validInput, openingDate: '2026-03-01T10:00:00Z' }).success,
    ).toBe(false);
    expect(accountInputSchema.safeParse({ ...validInput, openingDate: '01/03/2026' }).success).toBe(
      false,
    );
  });

  it('rejects an unknown account type', () => {
    // CHECKING is not a type here; it is North American (glossary section 3).
    expect(accountInputSchema.safeParse({ ...validInput, type: 'CHECKING' }).success).toBe(false);
  });

  it('rejects a blank or whitespace-only name', () => {
    expect(accountInputSchema.safeParse({ ...validInput, name: '' }).success).toBe(false);
    expect(accountInputSchema.safeParse({ ...validInput, name: '   ' }).success).toBe(false);
  });

  it('trims a name rather than storing the padding', () => {
    const result = accountInputSchema.parse({ ...validInput, name: '  Wallet  ' });
    expect(result.name).toBe('Wallet');
  });

  it('reports the offending field', () => {
    const result = accountInputSchema.safeParse({ ...validInput, openingBalanceMinor: 'abc' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['openingBalanceMinor']);
    }
  });
});

describe('accountSchema', () => {
  const account = { id: 'a1', ...validInput, isArchived: false, balanceMinor: '2345800' };

  it('accepts a derived balance alongside the opening balance', () => {
    expect(accountSchema.safeParse(account).success).toBe(true);
  });

  it('requires the derived balance, so a client cannot assume it equals the opening one', () => {
    const { balanceMinor: _omitted, ...withoutBalance } = account;
    expect(accountSchema.safeParse(withoutBalance).success).toBe(false);
  });
});
