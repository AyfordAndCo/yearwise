'use client';

import type { HTMLAttributes } from 'react';
import { useTheme } from './theme';
import { tokens } from './tokens';

export type BadgeTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';
export type BadgeVariant = 'subtle' | 'solid';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** `subtle` tints a background; `solid` fills. Solid is for one badge at a time. */
  variant?: BadgeVariant;
}

/**
 * A short status label: an account type, an archived marker, a count.
 *
 * Not for money and not for actions. A badge that needs a click is a `Button`.
 */
export function Badge({
  tone = 'neutral',
  variant = 'subtle',
  style,
  children,
  ...rest
}: BadgeProps) {
  const { colours } = useTheme();

  const toneColour: Record<BadgeTone, string> = {
    neutral: colours.muted,
    primary: colours.primary,
    info: colours.info,
    success: colours.success,
    warning: colours.warning,
    danger: colours.danger,
  };

  const toneBackground: Record<BadgeTone, string> = {
    neutral: colours.surface,
    primary: colours.tint,
    info: colours.infoDim,
    success: colours.successDim,
    warning: colours.warningDim,
    danger: colours.dangerDim,
  };

  const subtle = variant === 'subtle';

  return (
    <span
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing.xs,
        height: '1.375rem',
        padding: `0 ${tokens.spacing.sm}`,
        fontSize: tokens.typeScale.xs,
        fontWeight: 500,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        borderRadius: tokens.radius.sm,
        border: `1px solid ${subtle ? colours.border : 'transparent'}`,
        background: subtle ? toneBackground[tone] : toneColour[tone],
        // The page background is white in light and near-black in dark, which is
        // the correct contrast against the tone in both themes.
        color: subtle ? toneColour[tone] : colours.background,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
