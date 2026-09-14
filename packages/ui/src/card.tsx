'use client';

import type { CSSProperties, HTMLAttributes } from 'react';
import { useTheme } from './theme';
import { tokens } from './tokens';

export function Card({ style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const { colours } = useTheme();

  const base: CSSProperties = {
    background: colours.surface,
    border: `1px solid ${colours.border}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
  };

  return <div style={{ ...base, ...style }} {...rest} />;
}
