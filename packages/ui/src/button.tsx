'use client';

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { useTheme } from './theme';
import { tokens } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  children,
  type = 'button',
  style,
  ...rest
}: ButtonProps) {
  const { colours } = useTheme();

  const base: CSSProperties = {
    fontFamily: 'inherit',
    fontSize: tokens.typeScale.base,
    fontWeight: 600,
    borderRadius: tokens.radius.md,
    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
    border: '1px solid transparent',
    cursor: 'pointer',
  };

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: colours.primary,
      color: colours.primaryContrast,
      borderColor: colours.primary,
    },
    secondary: {
      background: 'transparent',
      color: colours.foreground,
      borderColor: colours.border,
    },
    ghost: {
      background: 'transparent',
      color: colours.foreground,
      borderColor: 'transparent',
    },
    danger: {
      background: colours.danger,
      color: colours.background,
      borderColor: colours.danger,
    },
  };

  // `style` is merged rather than spread, so a caller can extend a variant
  // instead of silently replacing every base style.
  return (
    <button type={type} style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}
