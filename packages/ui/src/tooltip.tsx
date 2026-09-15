'use client';

import { cloneElement, isValidElement, useId, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useTheme } from './theme';
import { tokens } from './tokens';

export interface TooltipProps {
  content: ReactNode;
  /** A single element. It receives `aria-describedby` when the tooltip is open. */
  children: ReactNode;
  placement?: 'top' | 'bottom';
}

/**
 * A short explanation attached to a control.
 *
 * Shown on hover **and** focus, so it is reachable by keyboard. The trigger is
 * cloned to receive `aria-describedby`, because an attribute on a wrapping span
 * is not announced for the control inside it.
 *
 * The tooltip is never the only home for information a user needs - it is
 * suppressed on touch and cannot be reached without a pointer or a keyboard.
 */
export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const { colours, elevation } = useTheme();
  const [open, setOpen] = useState(false);
  const id = useId();

  const trigger = isValidElement<{ 'aria-describedby'?: string }>(children)
    ? cloneElement<{ 'aria-describedby'?: string }>(children as ReactElement<{ 'aria-describedby'?: string }>, {
        'aria-describedby': open ? id : undefined,
      })
    : children;

  const position: CSSProperties =
    placement === 'top'
      ? { bottom: '100%', left: '50%', transform: 'translate(-50%, -6px)' }
      : { top: '100%', left: '50%', transform: 'translate(-50%, 6px)' };

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // React's onFocus/onBlur bubble, so a focused child opens the tooltip.
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      {trigger}
      {open && (
        <span
          role="tooltip"
          id={id}
          style={{
            position: 'absolute',
            zIndex: 80,
            width: 'max-content',
            maxWidth: '18rem',
            padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
            fontSize: tokens.typeScale.xs,
            lineHeight: 1.4,
            color: colours.background,
            background: colours.foreground,
            borderRadius: tokens.radius.sm,
            boxShadow: elevation.floating,
            pointerEvents: 'none',
            ...position,
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
