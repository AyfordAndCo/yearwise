import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from '../src/segmented-control';
import type { SegmentedOption } from '../src/segmented-control';
import { ThemeProvider } from '../src/theme';

const options: SegmentedOption[] = [
  { value: 'ALL', label: 'All' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
];

function renderControl(value = 'ALL', opts: SegmentedOption[] = options) {
  const onValueChange = vi.fn();
  render(
    <ThemeProvider>
      <SegmentedControl
        label="Transaction kind"
        options={opts}
        value={value}
        onValueChange={onValueChange}
      />
    </ThemeProvider>,
  );
  return { onValueChange };
}

const radio = (name: string) => screen.getByRole('radio', { name });

describe('SegmentedControl', () => {
  it('is a labelled radiogroup, not a row of buttons', () => {
    renderControl();

    expect(screen.getByRole('radiogroup', { name: 'Transaction kind' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(options.length);
  });

  it('checks exactly the selected option', () => {
    renderControl('INCOME');

    expect(radio('Income')).toHaveAttribute('aria-checked', 'true');
    expect(radio('All')).toHaveAttribute('aria-checked', 'false');
    expect(radio('Expense')).toHaveAttribute('aria-checked', 'false');
  });

  it('is a single tab stop, on the selected option', () => {
    renderControl('INCOME');

    expect(radio('Income')).toHaveAttribute('tabindex', '0');
    expect(radio('All')).toHaveAttribute('tabindex', '-1');
    expect(radio('Expense')).toHaveAttribute('tabindex', '-1');
  });

  it('falls back to the first option as the tab stop when nothing matches', () => {
    renderControl('SOMETHING_ELSE');

    expect(radio('All')).toHaveAttribute('tabindex', '0');
  });

  it('selects on click', () => {
    const { onValueChange } = renderControl();

    fireEvent.click(radio('Expense'));

    expect(onValueChange).toHaveBeenCalledWith('EXPENSE');
  });

  it('moves and selects with the arrow keys, wrapping at both ends', () => {
    const { onValueChange } = renderControl('ALL');

    fireEvent.keyDown(radio('All'), { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenLastCalledWith('INCOME');

    fireEvent.keyDown(radio('Expense'), { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenLastCalledWith('ALL');

    fireEvent.keyDown(radio('All'), { key: 'ArrowLeft' });
    expect(onValueChange).toHaveBeenLastCalledWith('EXPENSE');
  });

  it('jumps to the ends with Home and End', () => {
    const { onValueChange } = renderControl('INCOME');

    fireEvent.keyDown(radio('Income'), { key: 'Home' });
    expect(onValueChange).toHaveBeenLastCalledWith('ALL');

    fireEvent.keyDown(radio('Income'), { key: 'End' });
    expect(onValueChange).toHaveBeenLastCalledWith('EXPENSE');
  });

  it('skips a disabled option when arrowing', () => {
    const withDisabled: SegmentedOption[] = [
      { value: 'ALL', label: 'All' },
      { value: 'INCOME', label: 'Income', disabled: true },
      { value: 'EXPENSE', label: 'Expense' },
    ];
    const { onValueChange } = renderControl('ALL', withDisabled);

    fireEvent.keyDown(radio('All'), { key: 'ArrowRight' });

    // Income is disabled, so the next reachable option is Expense.
    expect(onValueChange).toHaveBeenLastCalledWith('EXPENSE');
  });

  it('does not select a disabled option on click', () => {
    const withDisabled: SegmentedOption[] = [
      { value: 'ALL', label: 'All' },
      { value: 'INCOME', label: 'Income', disabled: true },
    ];
    const { onValueChange } = renderControl('ALL', withDisabled);

    fireEvent.click(radio('Income'));

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
