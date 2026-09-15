import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MultiSelect } from '../src/multi-select';
import type { MultiSelectOption } from '../src/multi-select';
import { ThemeProvider } from '../src/theme';

const options: MultiSelectOption[] = [
  { value: 'a1', label: 'Main Cheque' },
  { value: 'a2', label: 'Savings' },
  { value: 'a3', label: 'Closed Account', disabled: true },
];

function renderSelect(value: string[] = [], props: Partial<React.ComponentProps<typeof MultiSelect>> = {}) {
  const onValueChange = vi.fn();
  render(
    <ThemeProvider>
      <MultiSelect
        label="Accounts"
        options={options}
        value={value}
        onValueChange={onValueChange}
        {...props}
      />
    </ThemeProvider>,
  );
  return { onValueChange };
}

const trigger = () => screen.getByRole('button', { name: 'Accounts' });

describe('MultiSelect', () => {
  it('shows the placeholder when nothing is selected', () => {
    renderSelect([], { placeholder: 'All accounts' });

    expect(trigger()).toHaveTextContent('All accounts');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('summarises the selection in the trigger', () => {
    renderSelect(['a1', 'a2']);

    expect(trigger()).toHaveTextContent('Main Cheque');
    expect(trigger()).toHaveTextContent('Savings');
  });

  it('collapses a long selection rather than overflowing', () => {
    renderSelect(['a1', 'a2'], { maxLabels: 1 });

    expect(trigger()).toHaveTextContent('Main Cheque');
    expect(trigger()).toHaveTextContent('+1 more');
    expect(trigger()).not.toHaveTextContent('Savings');
  });

  it('opens a labelled group of checkboxes', () => {
    renderSelect();

    fireEvent.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Accounts' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(options.length);
  });

  it('reflects the current selection in the checkboxes', () => {
    renderSelect(['a1']);
    fireEvent.click(trigger());

    expect(screen.getByRole('checkbox', { name: 'Main Cheque' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Savings' })).not.toBeChecked();
  });

  it('adds a value when checked', () => {
    const { onValueChange } = renderSelect(['a1']);
    fireEvent.click(trigger());

    fireEvent.click(screen.getByRole('checkbox', { name: 'Savings' }));

    expect(onValueChange).toHaveBeenCalledWith(['a1', 'a2']);
  });

  it('removes a value when unchecked', () => {
    const { onValueChange } = renderSelect(['a1', 'a2']);
    fireEvent.click(trigger());

    fireEvent.click(screen.getByRole('checkbox', { name: 'Savings' }));

    expect(onValueChange).toHaveBeenCalledWith(['a1']);
  });

  it('selects every enabled option, and never a disabled one', () => {
    const { onValueChange } = renderSelect();
    fireEvent.click(trigger());

    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));

    expect(onValueChange).toHaveBeenCalledWith(['a1', 'a2']);
  });

  it('clears the selection', () => {
    const { onValueChange } = renderSelect(['a1', 'a2']);
    fireEvent.click(trigger());

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it('disables an unavailable option', () => {
    renderSelect();
    fireEvent.click(trigger());

    expect(screen.getByRole('checkbox', { name: 'Closed Account' })).toBeDisabled();
  });

  it('closes on Escape', () => {
    renderSelect();
    fireEvent.click(trigger());

    fireEvent.keyDown(trigger(), { key: 'Escape' });

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('closes when a click lands outside it', () => {
    renderSelect();
    fireEvent.click(trigger());

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('indents a nested option past its parent', () => {
    const nested: MultiSelectOption[] = [
      { value: 'food', label: 'Food' },
      { value: 'groceries', label: 'Groceries', depth: 1 },
    ];
    renderSelect([], { options: nested });
    fireEvent.click(trigger());

    // Compare numerically rather than by string: jsdom collapses
    // `calc(0.5rem + 1rem)` to `calc(1.5rem)` in the serialised style.
    const indentOf = (label: string) => {
      const node = screen.getByRole('checkbox', { name: label }).closest('label');
      return Number.parseFloat((node?.style.paddingLeft ?? '').replace(/[^0-9.]/g, ''));
    };

    expect(indentOf('Groceries')).toBeGreaterThan(indentOf('Food'));
  });
});
