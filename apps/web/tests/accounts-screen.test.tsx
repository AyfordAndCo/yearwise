import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@yearwise/ui';
import { AccountsScreen } from '@/components/common/accounts-screen';
import type { AccountView } from '@/lib/workspace-store';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

/**
 * Fixtures mirror the shape the server sends: money as strings of minor units.
 * The balances are the DERIVED ones, which is why the cheque account's balance
 * differs from its opening balance.
 */
const ACCOUNTS: AccountView[] = [
  {
    id: 'acc-current',
    name: 'Main Cheque Account',
    type: 'CURRENT',
    openingBalanceMinor: 1_248_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
    balanceMinor: 2_345_800n,
  },
  {
    id: 'acc-savings',
    name: 'Emergency Fund',
    type: 'SAVINGS',
    openingBalanceMinor: 820_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
    balanceMinor: 820_000n,
  },
  {
    id: 'acc-card',
    name: 'Visa Platinum',
    type: 'CREDIT_CARD',
    openingBalanceMinor: -50_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
    balanceMinor: -170_000n,
  },
];

const toDto = (view: AccountView) => ({
  ...view,
  openingBalanceMinor: view.openingBalanceMinor.toString(),
  balanceMinor: view.balanceMinor.toString(),
});

/** A minimal stand-in for a fetch Response, so jsdom globals are not assumed. */
const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

function renderScreen(accounts: AccountView[] = ACCOUNTS) {
  return render(
    <ThemeProvider>
      <AccountsScreen initialAccounts={accounts} currency="ZAR" locale="en-ZA" />
    </ThemeProvider>,
  );
}

const digits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');

const dataRows = () =>
  screen.getAllByRole('row').filter((row) => within(row).queryAllByRole('cell').length > 0);

const accountNames = () =>
  dataRows().map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');

const groupHeaders = () =>
  Array.from(document.querySelectorAll('th[scope="colgroup"]')).map((cell) => cell.textContent);

const netWorthDigits = () => digits(screen.getByText('Net worth').parentElement?.textContent);

const rowFor = (name: string) => {
  const row = screen.getByText(name).closest('tr');
  if (row === null) throw new Error(`No row for ${name}`);
  return row;
};

const openRowMenu = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name: `Actions for ${name}` }));

describe('AccountsScreen — rendering', () => {
  it('lists a row per account', () => {
    renderScreen();

    expect(accountNames()).toEqual(['Main Cheque Account', 'Emergency Fund', 'Visa Platinum']);
  });

  it('groups by type, assets before debt', () => {
    renderScreen();

    expect(groupHeaders()).toEqual(['Cheque account', 'Savings', 'Credit card']);
  });

  it('shows the derived balance, not the opening balance', () => {
    renderScreen();

    const row = rowFor('Main Cheque Account');
    expect(digits(row.textContent)).toBe('2345800');
    expect(digits(row.textContent)).not.toBe('1248000');
  });

  it('sums net worth across accounts, with debt already negative', () => {
    renderScreen();

    // 23,458.00 + 8,200.00 - 1,700.00
    expect(netWorthDigits()).toBe('2995800');
  });

  it('shows a credit card as an amount owed, not a negative number', () => {
    renderScreen();

    const row = rowFor('Visa Platinum');
    expect(row.textContent).toContain('owed');
    expect(row.textContent).not.toContain('\u2212');
    expect(digits(row.textContent)).toBe('170000');
  });

  it('marks an archived account without hiding it', () => {
    renderScreen([{ ...ACCOUNTS[1]!, isArchived: true }]);

    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(digits(rowFor('Emergency Fund').textContent)).toBe('820000');
    expect(screen.getByText(/1 account excluded from net worth/)).toBeInTheDocument();
  });

  it('shows an onboarding prompt when there are no accounts', () => {
    renderScreen([]);

    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
  });
});

describe('AccountsScreen — archiving', () => {
  const archived = { ...ACCOUNTS[2]!, isArchived: true, balanceMinor: -170_000n };

  it('states the consequence before archiving', () => {
    renderScreen();

    openRowMenu('Visa Platinum');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(/stops counting toward net worth/);
    expect(dialog).toHaveTextContent(/stay in the ledger/);
  });

  it('sends the archive to the API and updates net worth', async () => {
    fetchMock.mockResolvedValue(jsonResponse(toDto(archived)));
    renderScreen();

    openRowMenu('Visa Platinum');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/accounts/acc-card');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({ isArchived: true });

    // 23,458.00 + 8,200.00, with the 1,700.00 owed no longer counted.
    await waitFor(() => expect(netWorthDigits()).toBe('3165800'));
    expect(screen.getByText(/1 account excluded from net worth/)).toBeInTheDocument();
  });

  it('refreshes the server-rendered sidebar after a mutation', async () => {
    fetchMock.mockResolvedValue(jsonResponse(toDto(archived)));
    renderScreen();

    openRowMenu('Visa Platinum');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('cancelling changes nothing', () => {
    renderScreen();

    openRowMenu('Visa Platinum');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(netWorthDigits()).toBe('2995800');
  });

  it('offers to unarchive once archived', () => {
    renderScreen([{ ...ACCOUNTS[2]!, isArchived: true }]);

    openRowMenu('Visa Platinum');
    expect(screen.getByRole('menuitem', { name: 'Unarchive' })).toBeInTheDocument();
  });

  it('never offers to delete an account', () => {
    renderScreen();

    openRowMenu('Emergency Fund');
    expect(screen.queryByRole('menuitem', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('surfaces a failed archive rather than pretending it worked', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Something went wrong' }, 500));
    renderScreen();

    openRowMenu('Visa Platinum');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    // Unchanged, because the write did not happen.
    expect(netWorthDigits()).toBe('2995800');
  });
});

describe('AccountsScreen — creating', () => {
  const created: AccountView = {
    id: 'acc-new',
    name: 'Cash Wallet',
    type: 'CASH',
    openingBalanceMinor: 25_000n,
    openingDate: '2026-03-01',
    includeInNetWorth: true,
    isArchived: false,
    balanceMinor: 25_000n,
  };

  it('posts the account as minor-unit strings and shows it', async () => {
    fetchMock.mockResolvedValue(jsonResponse(toDto(created), 201));
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'New account' }));
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Cash Wallet' } });
    fireEvent.change(screen.getByLabelText(/Type/), { target: { value: 'CASH' } });
    fireEvent.change(screen.getByLabelText(/Opening balance/), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Cash Wallet')).toBeInTheDocument();

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as Record<string, unknown>;
    expect(body.openingBalanceMinor).toBe('25000');
    expect(typeof body.openingBalanceMinor).toBe('string');

    // 29,958.00 + 250.00
    expect(netWorthDigits()).toBe('3020800');
  });

  it('sends an edit as a PATCH to the account', async () => {
    const renamed = { ...ACCOUNTS[1]!, name: 'Rainy Day Fund' };
    fetchMock.mockResolvedValue(jsonResponse(toDto(renamed)));
    renderScreen();

    openRowMenu('Emergency Fund');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Rainy Day Fund' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/accounts/acc-savings');
    expect(fetchMock.mock.calls[0]![1].method).toBe('PATCH');

    // Replaced, not appended: still three rows.
    expect(await screen.findByText('Rainy Day Fund')).toBeInTheDocument();
    expect(screen.queryByText('Emergency Fund')).not.toBeInTheDocument();
  });

  it('surfaces the API error message when a create is rejected', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'Invalid request', fields: { name: 'Give the account a name' } }, 400),
    );
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'New account' }));
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid request');
  });
});
