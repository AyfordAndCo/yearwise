import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../src/theme';
import { Toast } from '../src/toast';

function renderToast(props: Partial<React.ComponentProps<typeof Toast>> = {}) {
  const onDismiss = vi.fn();
  const view = render(
    <ThemeProvider>
      <Toast open onDismiss={onDismiss} title="Transaction deleted" {...props} />
    </ThemeProvider>,
  );
  return { ...view, onDismiss };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('renders nothing while closed', () => {
    renderToast({ open: false });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces politely, and assertively only when dangerous', () => {
    renderToast();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a danger toast as an alert', () => {
    renderToast({ tone: 'danger' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('stays until dismissed when duration is zero', () => {
    vi.useFakeTimers();
    const { onDismiss } = renderToast({ duration: 0 });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('auto-dismisses once the duration has elapsed, and not before', () => {
    vi.useFakeTimers();
    const { onDismiss } = renderToast({ duration: 10_000 });

    act(() => {
      vi.advanceTimersByTime(9_999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('pauses the countdown while the pointer is inside it', () => {
    // This is what makes the ledger's 10-second undo reachable: the deadline
    // must not pass while the user is aiming at the button.
    vi.useFakeTimers();
    const { onDismiss } = renderToast({ duration: 10_000 });

    fireEvent.mouseEnter(screen.getByRole('status'));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseLeave(screen.getByRole('status'));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('pauses the countdown while focus is inside it', () => {
    vi.useFakeTimers();
    const { onDismiss } = renderToast({
      duration: 10_000,
      action: { label: 'Undo', onClick: vi.fn() },
    });

    fireEvent.focus(screen.getByRole('button', { name: 'Undo' }));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses from the close control', () => {
    const { onDismiss } = renderToast();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('runs the action without dismissing itself', () => {
    // Undo must cancel the pending delete, so the toast must not vanish first.
    const onClick = vi.fn();
    const { onDismiss } = renderToast({ action: { label: 'Undo', onClick } });

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('renders the description when given one', () => {
    renderToast({ description: 'This cannot be undone after the timer.' });
    expect(screen.getByText('This cannot be undone after the timer.')).toBeInTheDocument();
  });
});
