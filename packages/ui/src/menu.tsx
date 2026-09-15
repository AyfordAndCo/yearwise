'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from './theme';
import { tokens } from './tokens';

export interface MenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  /** `danger` colours the item as destructive. It is never the default. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface MenuProps {
  /** Accessible name for the trigger and the menu. */
  label: string;
  items: ReadonlyArray<MenuItem>;
  /** Defaults to a horizontal-ellipsis button. */
  trigger?: ReactNode;
  align?: 'start' | 'end';
}

interface MenuPosition {
  top: number;
  left?: number;
  right?: number;
}

/**
 * A dropdown of actions attached to a control - the ledger's row actions.
 *
 * Rendered into a portal with fixed positioning, because the ledger's rows live
 * in a scrolling, clipped container and an absolutely positioned menu would be
 * cut off at the table edge.
 *
 * Keyboard contract: `ArrowDown` opens, arrows and Home/End move within, `Escape`
 * closes and returns focus to the trigger, `Tab` closes.
 */
export function Menu({ label, items, trigger, align = 'end' }: MenuProps) {
  const { colours, elevation } = useTheme();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const enabledIndexes = items
    .map((item, index) => (item.disabled === true ? -1 : index))
    .filter((index) => index >= 0);

  const close = useCallback((refocusTrigger: boolean) => {
    setOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  }, []);

  const openMenu = useCallback(() => {
    const node = triggerRef.current;
    if (node === null) return;
    const rect = node.getBoundingClientRect();
    setPosition(
      align === 'end'
        ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 4, left: rect.left },
    );
    setOpen(true);
  }, [align]);

  // Move focus to the first enabled item once the menu exists.
  useEffect(() => {
    if (!open) return;
    const first = items.findIndex((item) => item.disabled !== true);
    if (first >= 0) itemRefs.current[first]?.focus();
  }, [open, items]);

  // A click anywhere outside closes the menu.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) === true) return;
      if (triggerRef.current?.contains(target) === true) return;
      close(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  const move = (from: number, delta: number) => {
    if (enabledIndexes.length === 0) return;
    const position2 = enabledIndexes.indexOf(from);
    const next =
      position2 === -1
        ? enabledIndexes[0]!
        : enabledIndexes[(position2 + delta + enabledIndexes.length) % enabledIndexes.length]!;
    itemRefs.current[next]?.focus();
  };

  const handleItemKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(index, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(index, -1);
        break;
      case 'Home': {
        event.preventDefault();
        const first = enabledIndexes[0];
        if (first !== undefined) itemRefs.current[first]?.focus();
        break;
      }
      case 'End': {
        event.preventDefault();
        const last = enabledIndexes[enabledIndexes.length - 1];
        if (last !== undefined) itemRefs.current[last]?.focus();
        break;
      }
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  };

  const triggerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    font: 'inherit',
    fontSize: tokens.typeScale.lg,
    lineHeight: 1,
    color: colours.muted,
    background: 'transparent',
    border: `1px solid transparent`,
    borderRadius: tokens.radius.sm,
    cursor: 'pointer',
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => (open ? close(true) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openMenu();
          }
        }}
        style={triggerStyle}
      >
        {trigger ?? '\u22ef'}
      </button>

      {open &&
        position !== null &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            style={{
              position: 'fixed',
              zIndex: 75,
              minWidth: '11rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: tokens.spacing.xs,
              background: colours.raised,
              border: `1px solid ${colours.border}`,
              borderRadius: tokens.radius.md,
              boxShadow: elevation.floating,
              ...position,
            }}
          >
            {items.map((item, index) => (
              <button
                key={item.key}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect();
                  close(true);
                }}
                onKeyDown={(event) => handleItemKeyDown(event, index)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  font: 'inherit',
                  fontSize: tokens.typeScale.sm,
                  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                  color: item.tone === 'danger' ? colours.danger : colours.foreground,
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: tokens.radius.sm,
                  cursor: item.disabled === true ? 'not-allowed' : 'pointer',
                  opacity: item.disabled === true ? 0.5 : 1,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
