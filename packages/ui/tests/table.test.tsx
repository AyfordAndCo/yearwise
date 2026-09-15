import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Table } from '../src/table';
import type { TableColumn, TableProps } from '../src/table';
import { ThemeProvider } from '../src/theme';

interface Row {
  id: string;
  day: string;
  payee: string;
  amount: string;
}

const rows: Row[] = [
  { id: 'a', day: '14 March 2026', payee: 'Groceries', amount: '\u2212342.00' },
  { id: 'b', day: '14 March 2026', payee: 'Fuel', amount: '\u2212680.00' },
  { id: 'c', day: '13 March 2026', payee: 'Salary', amount: '+12,000.00' },
];

const columns: TableColumn<Row>[] = [
  { key: 'payee', header: 'Payee', render: (row) => row.payee },
  { key: 'amount', header: 'Amount', align: 'right', render: (row) => row.amount },
];

function renderTable(props: Partial<TableProps<Row>> = {}) {
  return render(
    <ThemeProvider>
      <Table
        label="Transactions"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('Table', () => {
  it('names the table for assistive technology', () => {
    renderTable();
    expect(screen.getByRole('table', { name: 'Transactions' })).toBeInTheDocument();
  });

  it('renders a header per column and one row per record', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Payee' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument();
    // One header row plus one row per record.
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
  });

  it('right-aligns a column declared as right, and leaves the rest left', () => {
    renderTable();

    const row = screen.getByText('Groceries').closest('tr');
    expect(row).not.toBeNull();
    const cells = within(row!).getAllByRole('cell');

    expect(cells[0]!.style.textAlign).toBe('left');
    expect(cells[1]!.style.textAlign).toBe('right');
  });

  describe('grouping', () => {
    it('renders one group header per group, not per row', () => {
      renderTable({ groupBy: (row) => row.day });

      // Two rows share 14 March; the header must appear once.
      expect(screen.getAllByText('14 March 2026')).toHaveLength(1);
      expect(screen.getAllByText('13 March 2026')).toHaveLength(1);
    });

    it('spans a group header across every column', () => {
      renderTable({ groupBy: (row) => row.day });

      const header = screen.getByText('14 March 2026');
      expect(header).toHaveAttribute('colspan', String(columns.length));
    });

    it('groups by the given key without reordering rows', () => {
      renderTable({ groupBy: (row) => row.day });

      // Only data rows have cells; a group header row holds a single rowheader.
      const dataRows = screen
        .getAllByRole('row')
        .filter((row) => within(row).queryAllByRole('cell').length > 0);

      const payees = dataRows.map((row) => within(row).getAllByRole('cell')[0]!.textContent);
      expect(payees).toEqual(['Groceries', 'Fuel', 'Salary']);
    });

    it('renders no group headers when no grouping is given', () => {
      renderTable();
      expect(screen.queryByText('14 March 2026')).not.toBeInTheDocument();
    });
  });

  describe('loading and empty', () => {
    it('renders skeleton rows while loading, and no data rows', () => {
      const { container } = renderTable({ loading: true, skeletonRows: 3 });

      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
      expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
    });

    it('renders the empty slot when there are no rows', () => {
      renderTable({ rows: [], empty: <span>No transactions match</span> });

      expect(screen.getByText('No transactions match')).toBeInTheDocument();
    });

    it('does not render the empty slot while loading', () => {
      renderTable({ rows: [], loading: true, empty: <span>No transactions match</span> });

      expect(screen.queryByText('No transactions match')).not.toBeInTheDocument();
    });
  });

  describe('row activation', () => {
    it('activates a row on click', () => {
      const onRowActivate = vi.fn();
      renderTable({ onRowActivate });

      fireEvent.click(screen.getByText('Groceries'));

      expect(onRowActivate).toHaveBeenCalledWith(rows[0]);
    });

    it('activates a row on Enter and on Space', () => {
      const onRowActivate = vi.fn();
      renderTable({ onRowActivate });

      const row = screen.getByText('Groceries').closest('tr')!;
      fireEvent.keyDown(row, { key: 'Enter' });
      fireEvent.keyDown(row, { key: ' ' });

      expect(onRowActivate).toHaveBeenCalledTimes(2);
    });

    it('makes rows focusable only when they can be activated', () => {
      const { unmount } = renderTable({ onRowActivate: vi.fn() });
      expect(screen.getByText('Groceries').closest('tr')).toHaveAttribute('tabindex', '0');
      unmount();

      renderTable();
      expect(screen.getByText('Groceries').closest('tr')).not.toHaveAttribute('tabindex');
    });
  });
});
