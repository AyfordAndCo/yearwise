import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '@yearwise/ui';
import AccountsPage from '@/app/(app)/accounts/page';
import { WorkspaceProvider } from '@/lib/workspace-store';

function renderPage() {
  return render(
    <ThemeProvider>
      <WorkspaceProvider>
        <AccountsPage />
      </WorkspaceProvider>
    </ThemeProvider>,
  );
}

const digits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');

/** Data rows only: a group header row holds a single th, not cells. */
const dataRows = () =>
  screen
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0);

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

const openRowMenu = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Actions for ${name}` }));
};

describe('AccountsPage', () => {
  it('lists a row per account', () => {
    renderPage();

    expect(accountNames()).toEqual(['Main Cheque Account', 'Emergency Fund', 'Visa Platinum']);
  });

  it('groups by type, assets before debt', () => {
    renderPage();

    // The order comes from the domain, not from insertion order.
    expect(groupHeaders()).toEqual(['Cheque account', 'Savings', 'Credit card']);
  });

  it('shows the derived balance, not the opening balance', () => {
    renderPage();

    // Opening 12,480.00 with -342.00, -680.00 and +12,000.00 recorded.
    const row = rowFor('Main Cheque Account');
    expect(digits(row.textContent)).toBe('2345800');
    // The opening balance must not leak into the balance column.
    expect(digits(row.textContent)).not.toBe('1248000');
  });

  it('sums net worth across accounts, with debt already negative', () => {
    renderPage();

    // 23,458.00 + 8,200.00 - 1,700.00
    expect(netWorthDigits()).toBe('2995800');
  });

  it('shows a credit card as an amount owed, not a negative number', () => {
    renderPage();

    const row = rowFor('Visa Platinum');
    expect(row.textContent).toContain('owed');
    expect(row.textContent).not.toContain('\u2212');
    expect(digits(row.textContent)).toBe('170000');
  });

  it('says nothing about exclusions when every account counts', () => {
    renderPage();

    expect(screen.queryByText(/excluded from net worth/)).not.toBeInTheDocument();
  });
});

describe('AccountsPage — archiving', () => {
  it('states the consequence before archiving', () => {
    renderPage();

    openRowMenu('Visa Platinum');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(/stops counting toward net worth/);
    expect(dialog).toHaveTextContent(/stay in the ledger/);
  });

  it('excludes an archived account from net worth and counts it', () => {
    renderPage();

    openRowMenu('Visa Platinum');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));

    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));

    // 23,458.00 + 8,200.00, with the 1,700.00 owed no longer counted.
    expect(netWorthDigits()).toBe('3165800');
    expect(screen.getByText(/1 account excluded from net worth/)).toBeInTheDocument();
  });

  it('marks the archived account, without removing it or its balance', () => {
    renderPage();

    openRowMenu('Emergency Fund');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' }),
    );

    expect(screen.getByText('Archived')).toBeInTheDocument();
    // History is never destroyed: the row count holds and the balance is intact.
    expect(accountNames()).toHaveLength(3);
    expect(digits(rowFor('Emergency Fund').textContent)).toBe('820000');
  });

  it('offers to unarchive once archived', () => {
    renderPage();

    openRowMenu('Emergency Fund');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' }),
    );

    openRowMenu('Emergency Fund');
    expect(screen.getByRole('menuitem', { name: 'Unarchive' })).toBeInTheDocument();
  });

  it('never offers to delete an account', () => {
    // Delete is deliberately not a control: archiving is the only path, which
    // is what makes referential integrity a non-issue (FEAT-FIN-01).
    renderPage();

    openRowMenu('Emergency Fund');

    expect(screen.queryByRole('menuitem', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('cancelling changes nothing', () => {
    renderPage();

    openRowMenu('Visa Platinum');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );

    expect(netWorthDigits()).toBe('2995800');
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });
});

describe('AccountsPage — creating', () => {
  it('adds an account and includes it in net worth', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'New account' }));

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Cash Wallet' } });
    fireEvent.change(screen.getByLabelText(/Type/), { target: { value: 'CASH' } });
    fireEvent.change(screen.getByLabelText(/Opening balance/), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Cash Wallet')).toBeInTheDocument();
    // 29,958.00 + 250.00
    expect(netWorthDigits()).toBe('3020800');
  });

  it('excludes a new account when "include in net worth" is cleared', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'New account' }));
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Dormant' } });
    fireEvent.change(screen.getByLabelText(/Opening balance/), { target: { value: '999' } });
    fireEvent.click(screen.getByLabelText(/Include in net worth/));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Dormant')).toBeInTheDocument();
    expect(netWorthDigits()).toBe('2995800');
    expect(screen.getByText(/1 account excluded from net worth/)).toBeInTheDocument();
  });
});
