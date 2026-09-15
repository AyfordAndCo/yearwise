import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '@yearwise/ui';
import TransactionsPage from '@/app/(app)/transactions/page';
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace-store';

/**
 * Reads the cheque account's derived balance, so a test can prove that
 * recording on the ledger moves the account.
 */
function BalanceProbe() {
  const { accounts } = useWorkspace();
  const cheque = accounts.find((account) => account.id === 'acc-current');
  return <span data-testid="cheque-balance">{cheque?.balanceMinor.toString() ?? ''}</span>;
}

function renderLedger() {
  return render(
    <ThemeProvider>
      <WorkspaceProvider>
        <TransactionsPage />
        <BalanceProbe />
      </WorkspaceProvider>
    </ThemeProvider>,
  );
}

const digits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');
const balance = () => screen.getByTestId('cheque-balance').textContent;

/**
 * Scoped to the totals region: "Income" is also a filter control label, so an
 * unscoped query would be ambiguous.
 */
const totalsRegion = () => screen.getByRole('region', { name: 'Totals for the current filter' });
const total = (label: string) =>
  digits(within(totalsRegion()).getByText(label).parentElement?.textContent);

/** The drawer, so its kind selector never collides with the filter bar's. */
const dialog = () => screen.getByRole('dialog');

const rowFor = (payee: string) => {
  const row = screen.getByText(payee).closest('tr');
  if (row === null) throw new Error(`No row for ${payee}`);
  return row;
};

const dataRows = () =>
  screen.getAllByRole('row').filter((row) => within(row).queryAllByRole('cell').length > 0);

const groupHeaders = () => document.querySelectorAll('th[scope="colgroup"]').length;

const openRowMenu = (payee: string) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Actions for ${payee}`) }));

const startCreate = () => fireEvent.click(screen.getByRole('button', { name: 'New transaction' }));

describe('TransactionsPage — the list', () => {
  it('lists every seeded transaction', () => {
    renderLedger();

    expect(dataRows()).toHaveLength(4);
  });

  it('groups by date, one header per date', () => {
    renderLedger();

    // 14, 13 and 12 March: three headers, with two rows under the first.
    expect(groupHeaders()).toBe(3);
  });

  it('shows the category with its parent, and the account', () => {
    renderLedger();

    const row = rowFor('Woolworths');
    expect(row.textContent).toContain('Food');
    expect(row.textContent).toContain('Groceries');
    expect(row.textContent).toContain('Main Cheque Account');
  });

  it('signs the amount by kind', () => {
    renderLedger();

    // Income carries a plus; an expense carries the minus sign.
    expect(rowFor('Ayford & Co').textContent).toContain('+');
    expect(rowFor('Woolworths').textContent).toContain('\u2212');
  });
});

describe('TransactionsPage — totals', () => {
  it('reports income, expenses and net for the filtered set', () => {
    renderLedger();

    expect(total('Income')).toBe('1200000');
    expect(total('Expenses')).toBe('222200');
    expect(total('Net')).toBe('977800');
  });

  it('covers the whole filtered set, not the visible page', () => {
    // The strip must not move as rows load.
    renderLedger();

    expect(total('Net')).toBe('977800');
    expect(dataRows().length).toBeLessThan(50);
  });
});

describe('TransactionsPage — filtering', () => {
  it('filters to income only', () => {
    renderLedger();

    fireEvent.click(screen.getByRole('radio', { name: 'Income' }));

    expect(dataRows()).toHaveLength(1);
    expect(total('Income')).toBe('1200000');
    // Zero, however the locale renders it. digits() keeps the ".00" digits.
    expect(total('Expenses')).toMatch(/^0+$/);
  });

  it('filters to expenses only', () => {
    renderLedger();

    fireEvent.click(screen.getByRole('radio', { name: 'Expense' }));

    expect(dataRows()).toHaveLength(3);
    expect(total('Income')).toMatch(/^0+$/);
  });

  it('searches payee and notes, case-insensitively', () => {
    renderLedger();

    fireEvent.change(screen.getByLabelText(/Search/), { target: { value: 'wool' } });

    expect(dataRows()).toHaveLength(1);
    expect(screen.getByText('Woolworths')).toBeInTheDocument();
  });

  it('searches notes as well as payee', () => {
    renderLedger();

    fireEvent.change(screen.getByLabelText(/Search/), { target: { value: 'march salary' } });

    expect(dataRows()).toHaveLength(1);
  });

  it('shows an empty state that is not the first-run one, and clears back', () => {
    renderLedger();

    fireEvent.change(screen.getByLabelText(/Search/), { target: { value: 'nothing matches this' } });

    expect(screen.getByText('No transactions match')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(dataRows()).toHaveLength(4);
  });

  it('renders a removable chip for each active filter', () => {
    renderLedger();

    fireEvent.click(screen.getByRole('radio', { name: 'Income' }));

    fireEvent.click(screen.getByRole('button', { name: 'Remove filter Income' }));

    expect(dataRows()).toHaveLength(4);
  });

  it('filters by date range inclusively at both ends', () => {
    renderLedger();

    // 13 to 14 March inclusive must include both days.
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-03-13' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-03-14' } });

    expect(dataRows()).toHaveLength(3);
    expect(screen.getByText('Ayford & Co')).toBeInTheDocument();
    expect(screen.queryByText('Nandos')).not.toBeInTheDocument();
  });
});

describe('TransactionsPage — recording', () => {
  it('adds a row and moves the account balance', () => {
    // The core slice of Phase 1: record an expense, the balance changes.
    renderLedger();
    const before = balance();

    startCreate();
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Payee/), { target: { value: 'Corner Cafe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record it' }));

    expect(screen.getByText('Corner Cafe')).toBeInTheDocument();
    expect(balance()).not.toBe(before);
    expect(digits(balance())).toBe('2335800'); // 23,458.00 - 100.00
  });

  it('records income against the account as well', () => {
    renderLedger();

    startCreate();
    fireEvent.click(within(dialog()).getByRole('radio', { name: 'Income' }));
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText(/Payee/), { target: { value: 'Refund' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record it' }));

    expect(digits(balance())).toBe('2395800'); // 23,458.00 + 500.00
  });

  it('rejects a zero amount, because a zero is not a fact worth recording', () => {
    renderLedger();

    startCreate();
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record it' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(dataRows()).toHaveLength(4);
  });

  it('rejects a typed minus, because the sign comes from the kind', () => {
    renderLedger();

    startCreate();
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '-100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record it' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(dataRows()).toHaveLength(4);
  });

  it('filters the category picker by kind', () => {
    renderLedger();

    startCreate();
    fireEvent.click(within(dialog()).getByRole('radio', { name: 'Income' }));

    const options = within(within(dialog()).getByLabelText(/Category/)).getAllByRole('option');
    const labels = options.map((option) => option.textContent ?? '');

    // An expense category is not offered against income. Children are prefixed
    // with a dash, because a native select cannot indent.
    expect(labels.some((label) => label.includes('Groceries'))).toBe(false);
    expect(labels.some((label) => label.includes('Main salary'))).toBe(true);
    expect(labels.some((label) => label.includes('Uncategorised'))).toBe(true);
  });
});

describe('TransactionsPage — editing and deleting', () => {
  it('edits an amount and moves the balance by the delta', () => {
    renderLedger();

    openRowMenu('Woolworths');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '400' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    // 23,458.00 + 342.00 (reversed) - 400.00
    expect(digits(balance())).toBe('2340000');
    expect(total('Expenses')).toBe('228000');
  });

  it('duplicates an entry, pre-filled but dated today', () => {
    renderLedger();

    openRowMenu('Woolworths');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));

    // Pre-filled with the original amount.
    expect(screen.getByLabelText(/Amount/)).toHaveValue('342.00');
    // Already 4 rows; the duplicate is not saved until it is submitted.
    expect(dataRows()).toHaveLength(4);
  });

  it('hides the row and offers an undo', () => {
    renderLedger();

    openRowMenu('Woolworths');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(screen.queryByText('Woolworths')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Transaction deleted');
    // Not yet gone: the totals still count it while the toast owns the row.
    expect(total('Expenses')).toBe('222200');
  });

  it('restores the row on undo', () => {
    renderLedger();

    openRowMenu('Woolworths');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByText('Woolworths')).toBeInTheDocument();
    expect(total('Expenses')).toBe('222200');
  });

  it('commits the delete when the toast is dismissed, and updates the totals', () => {
    renderLedger();

    openRowMenu('Woolworths');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText('Woolworths')).not.toBeInTheDocument();
    // 22,220.00 - 342.00, and the balance recovers the 342.00 that was spent.
    expect(total('Expenses')).toBe('188000');
    expect(digits(balance())).toBe('2380000');
  });
});
