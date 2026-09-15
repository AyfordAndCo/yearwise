'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from './theme';
import { tokens } from './tokens';

/**
 * `no-data` is a first-run prompt: there is nothing here yet, and the fix is an
 * action. `no-matches` is a filtered-to-nothing result: there is data, the
 * filter excluded it, and the fix is to relax the filter.
 *
 * FEAT-FIN-03 requires these to be *different states that look different*.
 * They are separate variants here rather than one padded box with different
 * copy, because the two need different actions and different emphasis.
 */
export type EmptyStateVariant = 'no-data' | 'no-matches';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Typically a `Button`. The primary action for the state. */
  action?: ReactNode;
  icon?: ReactNode;
  variant?: EmptyStateVariant;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  variant = 'no-data',
}: EmptyStateProps) {
  const { colours } = useTheme();
  const isPrompt = variant === 'no-data';

  const container: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    textAlign: 'center',
    padding: isPrompt ? tokens.spacing.xl : tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    background: isPrompt ? colours.tint : 'transparent',
    border: isPrompt ? `1px solid ${colours.primary}` : `1px dashed ${colours.border}`,
  };

  return (
    <div style={container}>
      {icon !== undefined && (
        <span aria-hidden="true" style={{ color: isPrompt ? colours.primary : colours.muted }}>
          {icon}
        </span>
      )}

      <p
        style={{
          margin: 0,
          fontSize: tokens.typeScale.base,
          fontWeight: 600,
          color: colours.foreground,
        }}
      >
        {title}
      </p>

      {description !== undefined && (
        <p
          style={{
            margin: 0,
            maxWidth: '34ch',
            fontSize: tokens.typeScale.sm,
            color: colours.muted,
          }}
        >
          {description}
        </p>
      )}

      {action !== undefined && <div style={{ marginTop: tokens.spacing.xs }}>{action}</div>}
    </div>
  );
}
