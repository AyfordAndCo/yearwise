'use client';

import type { InputHTMLAttributes } from 'react';
import { controlStyle, useControlFocus } from './control';
import { useTheme } from './theme';

export interface DateFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'defaultValue'
  > {
  /**
   * A naive calendar date as `YYYY-MM-DD`.
   *
   * Never a `Date`, never a timestamp, never an epoch number. Transaction dates
   * have no timezone (A6), and `new Date()` at this boundary is exactly the bug
   * that decision exists to prevent. A native date input already speaks and
   * returns `YYYY-MM-DD`, so nothing is parsed and nothing is converted.
   */
  value: string;
  onValueChange: (value: string) => void;
}

export function DateField({
  value,
  onValueChange,
  style,
  onFocus,
  onBlur,
  ...rest
}: DateFieldProps) {
  const { colours } = useTheme();
  const focus = useControlFocus(colours);

  return (
    <input
      {...rest}
      type="date"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      onFocus={(event) => {
        focus.onFocus();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focus.onBlur();
        onBlur?.(event);
      }}
      style={{ ...controlStyle(colours), ...focus.focusStyle, ...style }}
    />
  );
}
