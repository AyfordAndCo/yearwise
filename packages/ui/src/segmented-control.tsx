'use client';

import { useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTheme } from './theme';
import { tokens } from './tokens';

export interface SegmentedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  /** Accessible name for the group. */
  label: string;
  options: ReadonlyArray<SegmentedOption>;
  value: string;
  onValueChange: (value: string) => void;
  size?: 'sm' | 'md';
}

/**
 * A small set of mutually exclusive choices, all visible at once.
 *
 * A radio group, not a set of buttons: `role="radiogroup"` with `role="radio"`
 * and `aria-checked`, arrow-key navigation, one tab stop. That is what a screen
 * reader expects from "All / Income / Expense" and what a dropdown would take
 * two interactions to express.
 */
export function SegmentedControl({
  label,
  options,
  value,
  onValueChange,
  size = 'md',
}: SegmentedControlProps) {
  const { colours } = useTheme();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndexes = options
    .map((option, index) => (option.disabled === true ? -1 : index))
    .filter((index) => index >= 0);

  const selectedIndex = options.findIndex((option) => option.value === value);

  const selectAt = (index: number) => {
    const option = options[index];
    if (option === undefined) return;
    onValueChange(option.value);
    buttonRefs.current[index]?.focus();
  };

  const step = (from: number, delta: number) => {
    if (enabledIndexes.length === 0) return;
    const position = enabledIndexes.indexOf(from);
    const nextPosition =
      position === -1 ? 0 : (position + delta + enabledIndexes.length) % enabledIndexes.length;
    selectAt(enabledIndexes[nextPosition]!);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        step(index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        step(index, -1);
        break;
      case 'Home': {
        event.preventDefault();
        const first = enabledIndexes[0];
        if (first !== undefined) selectAt(first);
        break;
      }
      case 'End': {
        event.preventDefault();
        const last = enabledIndexes[enabledIndexes.length - 1];
        if (last !== undefined) selectAt(last);
        break;
      }
      default:
        break;
    }
  };

  const height = size === 'sm' ? '1.75rem' : '2.25rem';

  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{
        display: 'inline-flex',
        gap: '2px',
        padding: '2px',
        background: colours.surface,
        border: `1px solid ${colours.border}`,
        borderRadius: tokens.radius.md,
      }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        // A radiogroup is a single tab stop; arrows move within it.
        const isTabStop = selected || (selectedIndex === -1 && index === enabledIndexes[0]);

        return (
          <button
            key={option.value}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            tabIndex={isTabStop ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            style={{
              height,
              padding: `0 ${tokens.spacing.md}`,
              font: 'inherit',
              fontSize: tokens.typeScale.sm,
              fontWeight: selected ? 600 : 500,
              color: selected ? colours.primaryContrast : colours.muted,
              background: selected ? colours.primary : 'transparent',
              border: '1px solid transparent',
              borderRadius: tokens.radius.sm,
              cursor: option.disabled === true ? 'not-allowed' : 'pointer',
              opacity: option.disabled === true ? 0.5 : 1,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
