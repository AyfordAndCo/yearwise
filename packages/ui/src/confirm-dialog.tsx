'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';
import { useModal } from './use-modal';
import { useTheme } from './theme';
import { tokens } from './tokens';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for a destructive confirmation, such as archiving an account. */
  tone?: 'default' | 'danger';
  children?: ReactNode;
}

/**
 * A modal confirmation for an action that needs consent.
 *
 * `role="alertdialog"` rather than `dialog`, because the user must respond
 * before doing anything else. Cancel renders first so it receives initial
 * focus - the safe default when the action is destructive.
 *
 * The modal contract (focus trap, `Escape`, scroll lock, focus restore) comes
 * from `useModal`, shared with `Drawer`, so the two cannot drift.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  children,
}: ConfirmDialogProps) {
  const { colours, elevation } = useTheme();
  const { mounted, visible, durationMs, panelRef, handleKeyDown } = useModal(open, onClose);

  const titleId = useId();
  const descriptionId = useId();

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: colours.overlay,
          opacity: visible ? 1 : 0,
          transition: `opacity ${durationMs}ms ${tokens.motion.easing.out}`,
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 61,
          display: 'grid',
          placeItems: 'center',
          padding: tokens.spacing.lg,
          // The backdrop above handles the click; this layer must not block it.
          pointerEvents: 'none',
        }}
      >
        <div
          ref={panelRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description === undefined ? undefined : descriptionId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          style={{
            pointerEvents: 'auto',
            width: 'min(26rem, 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing.md,
            padding: tokens.spacing.lg,
            background: colours.raised,
            color: colours.foreground,
            border: `1px solid ${colours.border}`,
            borderRadius: tokens.radius.lg,
            boxShadow: elevation.floating,
            outline: 'none',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity ${durationMs}ms ${tokens.motion.easing.out}, transform ${durationMs}ms ${tokens.motion.easing.out}`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
            <h2 id={titleId} style={{ margin: 0, fontSize: tokens.typeScale.lg, fontWeight: 600 }}>
              {title}
            </h2>
            {description !== undefined && (
              <p
                id={descriptionId}
                style={{ margin: 0, fontSize: tokens.typeScale.sm, color: colours.muted }}
              >
                {description}
              </p>
            )}
          </div>

          {children}

          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing.sm }}
          >
            <Button variant="secondary" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
