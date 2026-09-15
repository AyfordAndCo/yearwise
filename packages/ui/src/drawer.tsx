'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';
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

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

/**
 * A modal slide-over.
 *
 * The behaviour that matters is the keyboard contract, not the animation:
 * focus moves in on open, is trapped while open, returns to its origin on
 * close, `Escape` closes, and the page behind cannot scroll.
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
  const reducedMotion = usePrefersReducedMotion();
  const durationMs = reducedMotion ? 1 : 200;

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const titleId = useId();
  const descriptionId = useId();

  // Mount, animate out, and hand focus back to whatever opened the drawer.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current =
        typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null);
      setMounted(true);
      return undefined;
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), durationMs);
    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
    return () => window.clearTimeout(timer);
  }, [open, durationMs]);

  // Animate in on the frame after the panel exists, so the transition runs.
  useEffect(() => {
    if (!open || !mounted) return undefined;
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open, mounted]);

  // Lock the page behind the drawer.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus into the drawer once it exists.
  useEffect(() => {
    if (!open || !mounted) return undefined;
    const panel = panelRef.current;
    if (panel === null) return undefined;
    const focusable = getFocusable(panel);
    (focusable[0] ?? panel).focus();
    return undefined;
  }, [open, mounted]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (panel === null) return;

      const focusable = getFocusable(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

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
    transition: reducedMotion
      ? 'none'
      : `transform ${durationMs}ms ${tokens.motion.easing.out}`,
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
    border: `1px solid transparent`,
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
