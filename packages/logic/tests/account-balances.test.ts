import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_KIND_ORDER,
  currentBalanceMinor,
  displayBalanceMinor,
  excludedFromNetWorthCount,
  isDebtAccount,
  netWorthMinor,
  openingBalanceMinorFromInput,
} from '../src/account-balances';

describe('currentBalanceMinor', () => {
  it('is the opening balance when nothing has been recorded', () => {
    expect(currentBalanceMinor(100000n, [])).toBe(100000n);
  });

  it('adds every transaction, because the sign already carries direction', () => {
    // +1,000.00 opening, -25.00 spent, +12,000.00 earned.
    expect(currentBalanceMinor(100000n, [-2500n, 1200000n])).toBe(1297500n);
  });

  it('accepts a negative opening balance, as an overdrawn account is real', () => {
    expect(currentBalanceMinor(-5000n, [])).toBe(-5000n);
  });

  it('does not drift on repeated minor-unit sums', () => {
    const cents = Array.from({ length: 10 }, () => 1n);
    expect(currentBalanceMinor(0n, cents)).toBe(10n);
  });

  it('survives values beyond the safe integer range', () => {
    expect(currentBalanceMinor(9007199254740993n, [])).toBe(9007199254740993n);
  });
});

describe('isDebtAccount', () => {
  it('is true only for credit cards and loans', () => {
    expect(isDebtAccount('CREDIT_CARD')).toBe(true);
    expect(isDebtAccount('LOAN')).toBe(true);
    expect(isDebtAccount('CURRENT')).toBe(false);
    expect(isDebtAccount('SAVINGS')).toBe(false);
    expect(isDebtAccount('CASH')).toBe(false);
  });
});

describe('displayBalanceMinor', () => {
  it('leaves an asset account as stored', () => {
    expect(displayBalanceMinor(100000n, 'CURRENT')).toBe(100000n);
  });

  it('flips a debt balance so it reads as an amount owed', () => {
    // Stored -1,200.00; the user should read 1,200.00 owed.
    expect(displayBalanceMinor(-120000n, 'CREDIT_CARD')).toBe(120000n);
    expect(displayBalanceMinor(-120000n, 'LOAN')).toBe(120000n);
  });

  it('flips a credit balance on a debt account too', () => {
    // A card in credit is real, and should read as a negative owed figure.
    expect(displayBalanceMinor(5000n, 'CREDIT_CARD')).toBe(-5000n);
  });
});

describe('netWorthMinor', () => {
  const included = (balanceMinor: bigint) => ({
    balanceMinor,
    includeInNetWorth: true,
    isArchived: false,
  });

  it('is zero with no accounts', () => {
    expect(netWorthMinor([])).toBe(0n);
  });

  it('adds debt without special-casing it, because it is already negative', () => {
    // 1,000.00 in a current account, 500.00 owed on a card -> 500.00.
    expect(netWorthMinor([included(100000n), included(-50000n)])).toBe(50000n);
  });

  it('excludes an archived account', () => {
    const entries = [
      included(100000n),
      { balanceMinor: 250000n, includeInNetWorth: true, isArchived: true },
    ];
    expect(netWorthMinor(entries)).toBe(100000n);
  });

  it('excludes an account opted out of net worth', () => {
    const entries = [
      included(100000n),
      { balanceMinor: 250000n, includeInNetWorth: false, isArchived: false },
    ];
    expect(netWorthMinor(entries)).toBe(100000n);
  });

  it('is negative when debt exceeds assets', () => {
    expect(netWorthMinor([included(1000n), included(-5000n)])).toBe(-4000n);
  });
});

describe('excludedFromNetWorthCount', () => {
  it('counts archived and opted-out accounts', () => {
    const entries = [
      { balanceMinor: 1n, includeInNetWorth: true, isArchived: false },
      { balanceMinor: 1n, includeInNetWorth: true, isArchived: true },
      { balanceMinor: 1n, includeInNetWorth: false, isArchived: false },
    ];
    expect(excludedFromNetWorthCount(entries)).toBe(2);
  });

  it('is zero when everything counts', () => {
    expect(
      excludedFromNetWorthCount([
        { balanceMinor: 1n, includeInNetWorth: true, isArchived: false },
      ]),
    ).toBe(0);
  });
});

describe('openingBalanceMinorFromInput', () => {
  it('stores an amount owed on a card as a negative balance', () => {
    // Type 500 owed, store -500, read "500.00 owed" (FEAT-FIN-01).
    expect(openingBalanceMinorFromInput(50000n, 'CREDIT_CARD')).toBe(-50000n);
    expect(openingBalanceMinorFromInput(50000n, 'LOAN')).toBe(-50000n);
  });

  it('stores an asset opening balance exactly as typed', () => {
    expect(openingBalanceMinorFromInput(1248000n, 'CURRENT')).toBe(1248000n);
    expect(openingBalanceMinorFromInput(820000n, 'SAVINGS')).toBe(820000n);
  });

  it('permits a negative opening balance on an asset account', () => {
    // An overdrawn current account is real.
    expect(openingBalanceMinorFromInput(-50000n, 'CURRENT')).toBe(-50000n);
  });

  it('leaves zero as zero, which is permitted and common', () => {
    expect(openingBalanceMinorFromInput(0n, 'CREDIT_CARD')).toBe(0n);
    expect(openingBalanceMinorFromInput(0n, 'CURRENT')).toBe(0n);
  });

  it('round-trips through the display flip', () => {
    // What you type is what you read back: 500 owed stays 500 owed.
    const stored = openingBalanceMinorFromInput(50000n, 'CREDIT_CARD');
    expect(displayBalanceMinor(stored, 'CREDIT_CARD')).toBe(50000n);
  });
});

describe('ACCOUNT_KIND_ORDER', () => {
  it('lists assets before debt, so the screen reads top-down', () => {
    expect(ACCOUNT_KIND_ORDER.indexOf('CURRENT')).toBeLessThan(
      ACCOUNT_KIND_ORDER.indexOf('CREDIT_CARD'),
    );
    expect(ACCOUNT_KIND_ORDER.at(-1)).toBe('LOAN');
  });
});
