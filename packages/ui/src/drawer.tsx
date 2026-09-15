'use client';

import { useId } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from './use-modal';
import { useTheme } from './theme';
import { tokens } from './tokens';

export type DrawerSide = 'right' | 'bottom';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /**
   * `right` is the desktop slide-over; `bottom` is the mobile sheet. Screens
   * choose by breakpoint rather than the component guessing - see
   * docs/04-design/page-and-component-plan.md section 5.3.
   */
  side?: DrawerSide;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * A modal slide-over.
 *
 * The behaviour that matters is the keyboard contract, not the animation:
 * focus moves in on open, is trapped while open, returns to its origin on
 * close, `Escape` closes, and the page behind cannot scroll. That contract
 * lives in `useModal`, shared with `ConfirmDialog`.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  side = 'right',
  children,
  footer,
}: DrawerProps) {
  const { colours, elevation } = useTheme();
  const { mounted, visible, durationMs, panelRef, handleKeyDown } = useModal(open, onClose);

  const titleId = useId();
  const descriptionId = useId();

  if (!mounted) return null;

  const isRight = side === 'right';

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: colours.overlay,
    opacity: visible ? 1 : 0,
    transition: `opacity ${durationMs}ms ${tokens.motion.easing.out}`,
    zIndex: 60,
  };

  const panelStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 61,
    display: 'flex',
    flexDirection: 'column',
    background: colours.raised,
    color: colours.foreground,
    boxShadow: elevation.floating,
    outline: 'none',
    transition: `transform ${durationMs}ms ${tokens.motion.easing.out}`,
    ...(isRight
      ? {
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(440px, 100vw)',
          borderLeft: `1px solid ${colours.border}`,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
        }
      : {
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '85vh',
          borderTop: `1px solid ${colours.border}`,
          borderTopLeftRadius: tokens.radius.lg,
          borderTopRightRadius: tokens.radius.lg,
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }),
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
    padding: tokens.spacing.lg,
    borderBottom: `1px solid ${colours.border}`,
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: tokens.spacing.lg,
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    borderTop: `1px solid ${colours.border}`,
  };

  const closeButtonStyle: CSSProperties = {
    flexShrink: 0,
    width: '2rem',
    height: '2rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    font: 'inherit',
    fontSize: tokens.typeScale.lg,
    lineHeight: 1,
    color: colours.muted,
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: tokens.radius.sm,
    cursor: 'pointer',
  };

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={panelStyle}
      >
        <header style={headerStyle}>
          <div>
            <h2
              id={titleId}
              style={{
                margin: 0,
                fontSize: tokens.typeScale.xl,
                fontWeight: 600,
                lineHeight: 1.25,
              }}
            >
              {title}
            </h2>
            {description !== undefined && (
              <p
                id={descriptionId}
                style={{
                  margin: `${tokens.spacing.xs} 0 0`,
                  fontSize: tokens.typeScale.sm,
                  color: colours.muted,
                }}
              >
                {description}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={closeButtonStyle}>
            {'\u00d7'}
          </button>
        </header>
        <div style={bodyStyle}>{children}</div>
        {footer !== undefined && <footer style={footerStyle}>{footer}</footer>}
      </div>
    </>,
    document.body,
  );
}
