import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Menu } from '../src/menu';
import type { MenuItem } from '../src/menu';
import { ThemeProvider } from '../src/theme';

function renderMenu(items?: MenuItem[]) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const resolved: MenuItem[] = items ?? [
    { key: 'edit', label: 'Edit', onSelect: onEdit },
    { key: 'duplicate', label: 'Duplicate', onSelect: vi.fn(), disabled: true },
    { key: 'delete', label: 'Delete', onSelect: onDelete, tone: 'danger' },
  ];

  render(
    <ThemeProvider>
      <Menu label="Row actions" items={resolved} />
    </ThemeProvider>,
  );

  return { onEdit, onDelete };
}

const trigger = () => screen.getByRole('button', { name: 'Row actions' });
const items = () => screen.getAllByRole('menuitem');

describe('Menu', () => {
  it('is closed initially and reports that to assistive technology', () => {
    renderMenu();

    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens on click and marks itself expanded', () => {
    renderMenu();

    fireEvent.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('opens on ArrowDown without activating the trigger', () => {
    renderMenu();

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('focuses the first enabled item on open, skipping disabled ones', () => {
    renderMenu();

    fireEvent.click(trigger());

    // "Duplicate" is disabled, so "Edit" is the first reachable item.
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
  });

  it('moves with arrows and wraps at both ends, skipping disabled items', () => {
    renderMenu();
    fireEvent.click(trigger());

    const edit = screen.getByRole('menuitem', { name: 'Edit' });
    const remove = screen.getByRole('menuitem', { name: 'Delete' });

    fireEvent.keyDown(edit, { key: 'ArrowDown' });
    expect(remove).toHaveFocus();

    fireEvent.keyDown(remove, { key: 'ArrowDown' });
    expect(edit).toHaveFocus();

    fireEvent.keyDown(edit, { key: 'ArrowUp' });
    expect(remove).toHaveFocus();
  });

  it('jumps to the first and last items with Home and End', () => {
    renderMenu();
    fireEvent.click(trigger());

    const edit = screen.getByRole('menuitem', { name: 'Edit' });
    const remove = screen.getByRole('menuitem', { name: 'Delete' });

    fireEvent.keyDown(edit, { key: 'End' });
    expect(remove).toHaveFocus();

    fireEvent.keyDown(remove, { key: 'Home' });
    expect(edit).toHaveFocus();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    renderMenu();
    fireEvent.click(trigger());
    const edit = screen.getByRole('menuitem', { name: 'Edit' });

    fireEvent.keyDown(edit, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('closes when a click lands outside it', () => {
    renderMenu();
    fireEvent.click(trigger());

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('runs the selected item and closes', () => {
    const { onEdit } = renderMenu();
    fireEvent.click(trigger());

    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not fire a disabled item', () => {
    renderMenu();
    fireEvent.click(trigger());

    const disabled = screen.getByRole('menuitem', { name: 'Duplicate' });
    expect(disabled).toBeDisabled();
    fireEvent.click(disabled);

    // Still open: a disabled item must not close the menu either.
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('treats every item as a single programmatic tab stop', () => {
    renderMenu();
    fireEvent.click(trigger());

    for (const item of items()) {
      expect(item).toHaveAttribute('tabindex', '-1');
    }
  });

  it('closes on Tab so focus can leave the menu', () => {
    renderMenu();
    fireEvent.click(trigger());

    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Edit' }), { key: 'Tab' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
