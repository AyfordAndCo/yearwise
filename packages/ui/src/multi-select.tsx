'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useControlFocus } from './control';
import { useTheme } from './theme';
import { tokens } from './tokens';

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Indent level. `1` nests the option under the one above it (category children). */
  depth?: number;
  disabled?: boolean;
}

export interface MultiSelectProps {
  /** Accessible name for the trigger and the option group. */
  label: string;
  options: ReadonlyArray<MultiSelectOption>;
  value: ReadonlyArray<string>;
  onValueChange: (value: string[]) => void;
  /** Shown in the trigger when nothing is selected. Defaults to "All". */
  placeholder?: string;
  /** Selected labels shown in the trigger before collapsing to "+N more". */
  maxLabels?: number;
  style?: CSSProperties;
}

/**
 * A multi-select over a supplied list: a filter control, not a form field.
 *
 * Native checkboxes inside a `<label>`, so selection is keyboard- and
 * screen-reader-correct without custom key handling. The trigger is a single
 * button that summarises the selection as text - removable chips are a
 * different component (`FilterChip`), because a button containing buttons is
 * invalid.
 *
 * `value` holds what the user picked. Where a parent implies its children, the
 * expansion happens in the query layer via `resolveCategoryIds`, not here.
 */
export function MultiSelect({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'All',
  maxLabels = 2,
  style,
}: MultiSelectProps) {
  const { colours, elevation } = useTheme();
  const focus = useControlFocus(colours);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const selected = new Set(value);
  const selectedOptions = options.filter((option) => selected.has(option.value));

  const summary =
    selectedOptions.length === 0
      ? placeholder
      : [
          ...selectedOptions.slice(0, maxLabels).map((option) => option.label),
          ...(selectedOptions.length > maxLabels
            ? [`+${selectedOptions.length - maxLabels} more`]
            : []),
        ].join(', ');

  const toggle = (optionValue: string, checked: boolean) => {
    const next = new Set(value);
    if (checked) next.add(optionValue);
    else next.delete(optionValue);
    onValueChange([...next]);
  };

  // A click anywhere outside closes the popover.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target) === true) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const triggerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    maxWidth: '16rem',
    height: '2.25rem',
    padding: `0 ${tokens.spacing.md}`,
    font: 'inherit',
    fontSize: tokens.typeScale.sm,
    color: selectedOptions.length === 0 ? colours.muted : colours.foreground,
    background: colours.surface,
    border: `1px solid ${colours.border}`,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    ...focus.focusStyle,
  };

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => setOpen((previous) => !previous)}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        style={triggerStyle}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {summary}
        </span>
        <span aria-hidden="true" style={{ color: colours.muted }}>
          {open ? '\u25b4' : '\u25be'}
        </span>
      </button>

      {open && (
        <div
          id={listId}
          role="group"
          aria-label={label}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 65,
            minWidth: '14rem',
            background: colours.raised,
            border: `1px solid ${colours.border}`,
            borderRadius: tokens.radius.md,
            boxShadow: elevation.floating,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: tokens.spacing.sm,
              padding: tokens.spacing.xs,
              borderBottom: `1px solid ${colours.border}`,
            }}
          >
            <button
              type="button"
              onClick={() =>
                onValueChange(
                  options.filter((option) => option.disabled !== true).map((option) => option.value),
                )
              }
              style={{
                font: 'inherit',
                fontSize: tokens.typeScale.xs,
                color: colours.primary,
                background: 'transparent',
                border: 'none',
                padding: tokens.spacing.xs,
                cursor: 'pointer',
              }}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onValueChange([])}
              style={{
                font: 'inherit',
                fontSize: tokens.typeScale.xs,
                color: colours.muted,
                background: 'transparent',
                border: 'none',
                padding: tokens.spacing.xs,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ maxHeight: '15rem', overflowY: 'auto', padding: tokens.spacing.xs }}>
            {options.map((option) => (
              <label
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                  paddingLeft: `calc(${tokens.spacing.sm} + ${(option.depth ?? 0) * 1}rem)`,
                  fontSize: tokens.typeScale.sm,
                  color: option.disabled === true ? colours.disabled : colours.foreground,
                  cursor: option.disabled === true ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(option.value)}
                  disabled={option.disabled}
                  onChange={(event) => toggle(option.value, event.target.checked)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
