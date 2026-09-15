import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { Drawer } from '../src/drawer';
import { ThemeProvider } from '../src/theme';

function renderDrawer(options: { open?: boolean; children?: ReactNode } = {}) {
  const onClose = vi.fn();
  const view = render(
    <ThemeProvider>
      <Drawer
        open={options.open ?? true}
        onClose={onClose}
        title="New transaction"
        description="Against Main Cheque Account"
      >
        {options.children ?? (
          <>
            <button type="button">First</button>
            <button type="button">Last</button>
          </>
        )}
      </Drawer>
    </ThemeProvider>,
  );
  return { ...view, onClose };
}

describe('Drawer', () => {
  it('renders nothing while closed', () => {
    renderDrawer({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a modal dialog named by its title and description', async () => {
    renderDrawer();
    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('New transaction');
    expect(dialog).toHaveAccessibleDescription('Against Main Cheque Account');
  });

  it('closes on Escape', async () => {
    const { onClose } = renderDrawer();
    const dialog = await screen.findByRole('dialog');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the overlay is clicked', async () => {
    const { onClose } = renderDrawer();
    await screen.findByRole('dialog');

    const overlay = document.body.querySelector('div[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus inside the drawer on open', async () => {
    renderDrawer();
    const dialog = await screen.findByRole('dialog');

    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('does not steal focus from an element that autofocused itself', async () => {
    // The ledger's create drawer autofocuses the amount field. The modal must
    // not drag focus back to the first control.
    renderDrawer({ children: <input aria-label="Amount" autoFocus /> });
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByLabelText('Amount')).toHaveFocus();
  });

  it('traps Tab: the last control wraps to the first', async () => {
    renderDrawer();
    const dialog = await screen.findByRole('dialog');

    const last = within(dialog).getByRole('button', { name: 'Last' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    // The header close button is the first focusable in the panel.
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('traps Shift+Tab: the first control wraps to the last', async () => {
    renderDrawer();
    const dialog = await screen.findByRole('dialog');

    const close = within(dialog).getByRole('button', { name: 'Close' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });

    expect(within(dialog).getByRole('button', { name: 'Last' })).toHaveFocus();
  });

  it('returns focus to whatever opened it, on close', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open drawer';
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(
      <ThemeProvider>
        <Drawer open onClose={vi.fn()} title="Title">
          <button type="button">First</button>
        </Drawer>
      </ThemeProvider>,
    );
    await screen.findByRole('dialog');

    rerender(
      <ThemeProvider>
        <Drawer open={false} onClose={vi.fn()} title="Title">
          <button type="button">First</button>
        </Drawer>
      </ThemeProvider>,
    );

    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('locks page scroll while open and restores it on close', async () => {
    const { rerender } = render(
      <ThemeProvider>
        <Drawer open onClose={vi.fn()} title="Title">
          <button type="button">First</button>
        </Drawer>
      </ThemeProvider>,
    );
    await screen.findByRole('dialog');
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <ThemeProvider>
        <Drawer open={false} onClose={vi.fn()} title="Title">
          <button type="button">First</button>
        </Drawer>
      </ThemeProvider>,
    );
    expect(document.body.style.overflow).toBe('');
  });
});
