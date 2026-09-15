import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../src/confirm-dialog';
import { ThemeProvider } from '../src/theme';

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const view = render(
    <ThemeProvider>
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Archive this account?"
        description="Its transactions stay in the ledger."
        {...props}
      />
    </ThemeProvider>,
  );
  return { ...view, onClose, onConfirm };
}

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('is an alert dialog, because the user must respond before continuing', async () => {
    renderDialog();
    const dialog = await screen.findByRole('alertdialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Archive this account?');
    expect(dialog).toHaveAccessibleDescription('Its transactions stay in the ledger.');
  });

  it('focuses Cancel first, the safe default for a destructive action', async () => {
    renderDialog({ tone: 'danger' });

    expect(await screen.findByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('confirms through the primary action', async () => {
    const { onConfirm, onClose } = renderDialog();

    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancels without confirming', async () => {
    const { onConfirm, onClose } = renderDialog();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('honours custom action labels', async () => {
    renderDialog({ confirmLabel: 'Archive', cancelLabel: 'Keep it' });

    expect(await screen.findByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const { onClose } = renderDialog();
    const dialog = await screen.findByRole('alertdialog');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', async () => {
    const { onClose } = renderDialog();
    await screen.findByRole('alertdialog');

    const backdrop = document.body.querySelector('div[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders extra detail between the description and the actions', async () => {
    renderDialog({ children: <p>3 accounts are excluded from net worth.</p> });

    expect(await screen.findByText('3 accounts are excluded from net worth.')).toBeInTheDocument();
  });
});
