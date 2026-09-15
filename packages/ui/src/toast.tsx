'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useControlFocus } from './control';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';
import { useTheme } from './theme';
import { tokens } from './tokens';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  open: boolean;
  onDismiss: () => void;
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Typically "Undo". Rendered as a text button in the tone's colour. */
  action?: ToastAction;
  /**
   * Milliseconds before auto-dismiss. `0` keeps the toast until dismissed.
   *
   * The countdown pauses while the pointer or focus is inside the toast, so an
   * undo affordance can always be reached before the deadline passes. Pausing
   * restarts the full duration on resume, which is deliberately lenient.
   */
  duration?: number;
}

/**
 * A transient message, and the vehicle for the ledger's 10-second delete undo.
 *
 * The toast owns its own timer and its own pause behaviour. It does **not** own
 * a queue: which toasts exist is application state, and this package holds no
 * application state. Compose them inside a `ToastRegion`.
 *
 * ```tsx
 * <ToastRegion>
 *   {toasts.map((toast) => (
 *     <Toast key={toast.id} open onDismiss={...} title="Transaction deleted"
 *            action={{ label: 'Undo', onClick: undo }} duration={10_000} />
 *   ))}
 * </ToastRegion>
 * ```
 */
export function Toast({
  open,
  onDismiss,
  title,
  description,
  tone = 'info',
  action,
  duration = 0,
}: ToastProps) {
  const { colours, elevation } = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const actionFocus = useControlFocus(colours);
  const closeFocus = useControlFocus(colours);

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  const transitionMs = reducedMotion ? 1 : 200;

  useEffect(() => {
    if (open) {
      setMounted(true);
      return undefined;
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), transitionMs);
    return () => window.clearTimeout(timer);
  }, [open, transitionMs]);

  useEffect(() => {
    if (!open || !mounted) return undefined;
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open, mounted]);

  // Auto-dismiss. Paused while the toast is hovered or focused.
  useEffect(() => {
    if (!open || duration <= 0 || paused) return undefined;
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [open, duration, paused, onDismiss]);

  if (!mounted) return null;

  const accent =
    tone === 'success'
      ? colours.success
      : tone === 'warning'
        ? colours.warning
        : tone === 'danger'
          ? colours.danger
          : colours.info;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
    minWidth: '18rem',
    maxWidth: '24rem',
    padding: tokens.spacing.md,
    background: colours.raised,
    color: colours.foreground,
    border: `1px solid ${colours.border}`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: tokens.radius.md,
    boxShadow: elevation.floating,
    // Re-enable pointer events, which the ToastRegion disables on itself.
    pointerEvents: 'auto',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(8px)',
    transition: reducedMotion
      ? 'none'
      : `opacity ${transitionMs}ms ${tokens.motion.easing.out}, transform ${transitionMs}ms ${tokens.motion.easing.out}`,
  };

  const closeButtonStyle: CSSProperties = {
    flexShrink: 0,
    width: '1.75rem',
    height: '1.75rem',
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
    ...closeFocus.focusStyle,
  };

  const actionButtonStyle: CSSProperties = {
    font: 'inherit',
    fontSize: tokens.typeScale.sm,
    fontWeight: 600,
    color: accent,
    background: 'transparent',
    border: '1px solid transparent',
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    borderRadius: tokens.radius.sm,
    cursor: 'pointer',
    ...actionFocus.focusStyle,
  };

  return createPortal(
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      style={containerStyle}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing.sm }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: tokens.typeScale.base }}>{title}</p>
          {description !== undefined && (
            <p
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
        <button type="button" onClick={onDismiss} aria-label="Dismiss" style={closeButtonStyle}>
          {'\u00d7'}
        </button>
      </div>

      {action !== undefined && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={action.onClick} style={actionButtonStyle}>
            {action.label}
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}

/**
 * The fixed region toasts render into, as a polite live region.
 *
 * Positioned bottom-right on desktop and bottom-centred on narrow viewports.
 * A live region must exist in the DOM *before* its content changes for screen
 * readers to announce the change, which is why the region and the toast are
 * separate components.
 */
export function ToastRegion({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.sm,
        right: tokens.spacing.lg,
        bottom: tokens.spacing.lg,
        maxWidth: `calc(100vw - ${tokens.spacing.lg} - ${tokens.spacing.lg})`,
        // The region must not swallow clicks on the page behind it while it is
        // empty. Each toast re-enables pointer events on itself.
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
