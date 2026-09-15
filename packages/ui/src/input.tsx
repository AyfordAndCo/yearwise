'use client';

import type { CSSProperties, InputHTMLAttributes } from 'react';
import { useTheme } from './theme';
import { tokens } from './tokens';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { colours } = useTheme();

  const style: CSSProperties = {
    fontFamily: 'inherit',
    fontSize: tokens.typeScale.base,
    color: colours.foreground,
    background: colours.surface,
    border: `1px solid ${colours.border}`,
    borderRadius: tokens.radius.md,
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    width: '100%',
  };

  return <input style={style} {...props} />;
}
