import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@yearwise/ui';
import { AccountDrawer } from '@/components/common/account-drawer';
import type { AccountView } from '@/lib/workspace-store';

function renderDrawer(account?: AccountView) {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(
    <ThemeProvider>
      <AccountDrawer open onClose={onClose} account={account} onSubmit={onSubmit} />
    </ThemeProvider>,
  );
  return { onSubmit, onClose };
}

const name = () => screen.getByLabelText(/Name/);
const type = () => screen.getByLabelText(/Type/);
const balance = () => screen.getByLabelText(/Opening balance|Amount owed/);

function fill(fields: { name?: string; type?: string; balance?: string }) {
  if (fields.name !== undefined) fireEvent.change(name(), { target: { value: fields.name } });
  if (fields.type !== undefined) fireEvent.change(type(), { target: { value: fields.type } });
  if (fields.balance !== undefined) fireEvent.change(balance(), { target: { value: fields.balance } });
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

describe('AccountDrawer — opening balance sign', () => {
  it('stores an amount owed on a card as a negative balance', () => {
    // The user types what they owe; the sign convention wants it negative, so
    // that the display flip reads back "500.00 owed" (FEAT-FIN-01).
    const { onSubmit } = renderDrawer();

    fill({ name: 'Visa Platinum', type: 'CREDIT_CARD', balance: '500' });
    submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      name: 'Visa Platinum',
      type: 'CREDIT_CARD',
      openingBalanceMinor: -50000n,
    });
  });

  it('asks for an "Amount owed" on a debt account, not an opening balance', () => {
    renderDrawer();
    fill({ type: 'LOAN' });

    expect(screen.getByLabelText(/Amount owed/)).toBeInTheDocument();
  });

  it('stores an asset opening balance exactly as typed', () => {
    const { onSubmit } = renderDrawer();

    fill({ name: 'Main Cheque', type: 'CURRENT', balance: '12480.00' });
    submit();

    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ openingBalanceMinor: 1248000n });
  });

  it('permits an overdrawn asset account', () => {
    // "Negative opening balance on a current account. Permitted." — an
    // overdrawn account is real.
    const { onSubmit } = renderDrawer();

    fill({ name: 'Overdrawn', type: 'CURRENT', balance: '-500' });
    submit();

    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ openingBalanceMinor: -50000n });
  });

  it('accepts a typographic minus as well as a hyphen', () => {
    const { onSubmit } = renderDrawer();

    fill({ name: 'Overdrawn', type: 'CURRENT', balance: '\u2212500' });
    submit();

    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ openingBalanceMinor: -50000n });
  });

  it('rejects a minus typed against a debt account, rather than flipping it', () => {
    const { onSubmit } = renderDrawer();

    fill({ name: 'Visa', type: 'CREDIT_CARD', balance: '-500' });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/positive number/i);
  });

  it('permits a zero opening balance, which is common', () => {
    const { onSubmit } = renderDrawer();

    fill({ name: 'New Wallet', type: 'CASH', balance: '0' });
    submit();

    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ openingBalanceMinor: 0n });
  });
});

describe('AccountDrawer — validation', () => {
  it('requires a name', () => {
    const { onSubmit } = renderDrawer();

    fill({ balance: '100' });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/name/i);
  });

  it('rejects more precision than the currency allows, rather than rounding', () => {
    const { onSubmit } = renderDrawer();

    fill({ name: 'Precise', type: 'CURRENT', balance: '12.345' });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/2 decimal places/i);
  });

  it('rejects nonsense', () => {
    const { onSubmit } = renderDrawer();

    fill({ name: 'Nonsense', type: 'CURRENT', balance: 'abc' });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('AccountDrawer — editing', () => {
  const card: AccountView = {
    id: 'acc-card',
    name: 'Visa Platinum',
    type: 'CREDIT_CARD',
    openingBalanceMinor: -50_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
    balanceMinor: -50_000n,
  };

  it('prefills an amount owed as a positive magnitude', () => {
    // Stored -500.00 must come back as "500.00", not "-500.00" — otherwise
    // saving an untouched edit would flip the sign.
    renderDrawer(card);

    expect(balance()).toHaveValue('500.00');
  });

  it('prefills an overdrawn asset balance with its minus intact', () => {
    renderDrawer({
      ...card,
      type: 'CURRENT',
      openingBalanceMinor: -50_000n,
    });

    expect(balance()).toHaveValue('-500.00');
  });

  it('saves an untouched edit without changing the balance', () => {
    const { onSubmit } = renderDrawer(card);

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ openingBalanceMinor: -50_000n });
  });

  it('offers save rather than create when editing', () => {
    renderDrawer(card);

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
  });
});
