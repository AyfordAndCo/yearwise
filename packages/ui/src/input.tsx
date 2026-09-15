'use client';

import type { InputHTMLAttributes } from 'react';
import { controlStyle, useControlFocus } from './control';
import { useTheme } from './theme';

export function Input({ style, onFocus, onBlur, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const { colours } = useTheme();
  const focus = useControlFocus(colours);

  return (
    <input
      {...rest}
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
