import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../src/theme';
import { Tooltip } from '../src/tooltip';

function renderTooltip() {
  render(
    <ThemeProvider>
      <Tooltip content="Balances are derived, never stored">
        <button type="button">Derived</button>
      </Tooltip>
    </ThemeProvider>,
  );
  return screen.getByRole('button', { name: 'Derived' });
}

describe('Tooltip', () => {
  it('is hidden until it is needed', () => {
    const trigger = renderTooltip();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('appears on focus, so a keyboard user can reach it', () => {
    const trigger = renderTooltip();

    act(() => {
      trigger.focus();
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('describes the trigger it was cloned onto, not the wrapper', () => {
    const trigger = renderTooltip();

    act(() => {
      trigger.focus();
    });

    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy!)).toHaveAttribute('role', 'tooltip');
  });

  it('hides again on blur, and drops the description', () => {
    const trigger = renderTooltip();

    act(() => {
      trigger.focus();
    });
    act(() => {
      trigger.blur();
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('appears on hover and hides when the pointer leaves', () => {
    const trigger = renderTooltip();

    fireEvent.mouseOver(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseOut(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides on Escape', () => {
    const trigger = renderTooltip();

    act(() => {
      trigger.focus();
    });
    fireEvent.keyDown(trigger, { key: 'Escape' });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
