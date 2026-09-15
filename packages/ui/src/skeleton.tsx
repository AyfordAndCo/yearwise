'use client';

import type { HTMLAttributes } from 'react';
import { useTheme } from './theme';
import { tokens } from './tokens';

export type SkeletonRadius = keyof typeof tokens.radius;

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  width?: string | number;
  height?: string | number;
  radius?: SkeletonRadius;
}

/**
 * A loading placeholder shaped like the content it replaces.
 *
 * A skeleton that does not match the final layout is worse than a spinner,
 * because the page then shifts as data lands (design-system section 9.3).
 *
 * The shimmer keyframe (`yw-shimmer`) is declared by the consuming app - see
 * `apps/web/app/globals.css`. A JS package cannot declare one without a CSS
 * layer. If the keyframe is absent the block still renders; it simply does not
 * animate. Reduced motion neutralises it globally.
 */
export function Skeleton({
  width = '100%',
  height = '0.75rem',
  radius = 'sm',
  style,
  ...rest
}: SkeletonProps) {
  const { colours } = useTheme();

  return (
    <span
      {...rest}
      aria-hidden="true"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: tokens.radius[radius],
        background: colours.border,
        animation: 'yw-shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}
