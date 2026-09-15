'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

/**
 * Everything focusable and enabled inside a container.
 *
 * Visibility is decided by `hidden` and `aria-hidden`, deliberately **not** by
 * `offsetParent`. `offsetParent` is null for every element in jsdom - which
 * would make the focus trap untestable - and is also null for children of a
 * `position: fixed` ancestor in some engines, which is exactly what a modal is.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]:not([hidden]):not([aria-hidden="true"])',
  'button:not([disabled]):not([hidden]):not([aria-hidden="true"])',
  'input:not([disabled]):not([type="hidden"]):not([hidden]):not([aria-hidden="true"])',
  'select:not([disabled]):not([hidden]):not([aria-hidden="true"])',
  'textarea:not([disabled]):not([hidden]):not([aria-hidden="true"])',
  '[tabindex]:not([tabindex="-1"]):not([hidden]):not([aria-hidden="true"])',
].join(',');

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export interface UseModalResult {
  /** The portal should render at all. */
  mounted: boolean;
  /** The enter transition should be running. */
  visible: boolean;
  /** Transition duration in ms; 1 when reduced motion is requested. */
  durationMs: number;
  panelRef: RefObject<HTMLDivElement | null>;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
}

/**
 * The behaviour every modal shares: mount and unmount around a transition,
 * lock the page behind it, move focus in, trap it, return it on close, and
 * close on `Escape`.
 *
 * Extracted so `Drawer` and `ConfirmDialog` cannot drift apart. A focus trap
 * that exists twice is a focus trap that is correct once.
 */
export function useModal(open: boolean, onClose: () => void): UseModalResult {
  const reducedMotion = usePrefersReducedMotion();
  const durationMs = reducedMotion ? 1 : 200;

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Mount, animate out, and hand focus back to whatever opened the modal.
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

  // Lock the page behind the modal.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus into the modal once it exists.
  useEffect(() => {
    if (!open || !mounted) return undefined;
    const panel = panelRef.current;
    if (panel === null) return undefined;

    // Respect an element that focused itself on mount - an `autoFocus` on the
    // amount field, say. Stealing focus back to the first control would undo
    // exactly the behaviour a data-entry drawer depends on.
    if (panel.contains(document.activeElement)) return undefined;

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

  return { mounted, visible, durationMs, panelRef, handleKeyDown };
}
