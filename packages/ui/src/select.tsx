'use client';

import type { SelectHTMLAttributes } from 'react';
import { controlStyle, useControlFocus } from './control';
import { useTheme } from './theme';
import { tokens } from './tokens';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: ReadonlyArray<SelectOption>;
  /** Rendered as a disabled first option when the current value is empty. */
  placeholder?: string;
}

/**
 * A chevron drawn as a data URI, so the control needs no icon dependency and
 * the stroke tracks the theme.
 */
function chevronBackground(colour: string): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" ' +
    `fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" ` +
    'stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * A single-choice control over a known, short option list.
 *
 * Deliberately a native `select`: it is keyboard- and screen-reader-correct for
 * free, and works on touch without custom code. Searchable and multi-select
 * pickers are a different problem and a different component (`Combobox`,
 * `AccountMultiSelect`, `CategoryMultiSelect` - still to build).
 */
export function Select({
  options,
  placeholder,
  style,
  onFocus,
  onBlur,
  ...rest
}: SelectProps) {
  const { colours } = useTheme();
  const focus = useControlFocus(colours);

  return (
    <select
      {...rest}
      onFocus={(event) => {
        focus.onFocus();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focus.onBlur();
        onBlur?.(event);
      }}
      style={{
        ...controlStyle(colours),
        appearance: 'none',
        paddingRight: tokens.spacing.xl,
        backgroundImage: chevronBackground(colours.muted),
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `right ${tokens.spacing.sm} center`,
        cursor: 'pointer',
        ...focus.focusStyle,
        ...style,
      }}
    >
      {placeholder !== undefined && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
