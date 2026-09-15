import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountMultiSelect } from '../src/account-multi-select';
import type { AccountOption } from '../src/account-multi-select';
import { CategoryMultiSelect } from '../src/category-multi-select';
import type { CategoryOption } from '../src/category-multi-select';
import { ThemeProvider } from '../src/theme';

const accounts: AccountOption[] = [
  { id: 'a1', name: 'Main Cheque' },
  { id: 'a2', name: 'Emergency Fund' },
  { id: 'a3', name: 'Old Cheque', isArchived: true },
];

const categories: CategoryOption[] = [
  { id: 'food', name: 'Food', parentId: null },
  { id: 'groceries', name: 'Groceries', parentId: 'food' },
  { id: 'income', name: 'Income', parentId: null },
  { id: 'housing', name: 'Housing', parentId: null, isArchived: true },
];

const optionLabels = () =>
  screen.getAllByRole('checkbox').map((box) => box.closest('label')?.textContent ?? '');

describe('AccountMultiSelect', () => {
  it('offers every account, including archived ones', () => {
    // A filter must reach an archived account's history, which archiving keeps.
    render(
      <ThemeProvider>
        <AccountMultiSelect accounts={accounts} value={[]} onValueChange={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accounts' }));

    expect(optionLabels()).toEqual(['Main Cheque', 'Emergency Fund', 'Old Cheque (archived)']);
  });

  it('keeps the archived option selectable', () => {
    render(
      <ThemeProvider>
        <AccountMultiSelect accounts={accounts} value={[]} onValueChange={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accounts' }));

    expect(screen.getByRole('checkbox', { name: 'Old Cheque (archived)' })).toBeEnabled();
  });

  it('reports the account id, not its name', () => {
    const onValueChange = vi.fn();
    render(
      <ThemeProvider>
        <AccountMultiSelect accounts={accounts} value={[]} onValueChange={onValueChange} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accounts' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Emergency Fund' }));

    expect(onValueChange).toHaveBeenCalledWith(['a2']);
  });
});

describe('CategoryMultiSelect', () => {
  it('orders parents before their children, and roots by name', () => {
    render(
      <ThemeProvider>
        <CategoryMultiSelect categories={categories} value={[]} onValueChange={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Categories' }));

    expect(optionLabels()).toEqual(['Food', 'Groceries', 'Housing (archived)', 'Income']);
  });

  it('indents a child under its parent', () => {
    render(
      <ThemeProvider>
        <CategoryMultiSelect categories={categories} value={[]} onValueChange={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Categories' }));

    const parent = screen.getByRole('checkbox', { name: 'Food' }).closest('label');
    const child = screen.getByRole('checkbox', { name: 'Groceries' }).closest('label');

    expect(parent?.style.paddingLeft).toContain('0.5rem');
    expect(child?.style.paddingLeft).toContain('1.5rem');
  });

  it('reports only what the user picked, leaving expansion to the query layer', () => {
    // Selecting "Food" must not rewrite the selection to include Groceries;
    // resolveCategoryIds does that when the filter is built (FEAT-FIN-03).
    const onValueChange = vi.fn();
    render(
      <ThemeProvider>
        <CategoryMultiSelect categories={categories} value={[]} onValueChange={onValueChange} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Categories' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Food' }));

    expect(onValueChange).toHaveBeenCalledWith(['food']);
  });
});
