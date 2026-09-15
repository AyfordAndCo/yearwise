'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { tokens } from './tokens';
import type { ThemeColours } from './tokens';

/**
 * Shared visual base for the text-entry controls: `Input`, `Select`, `DateField`.
 *
 * Kept in one place so the three cannot drift apart - a divergent control is
 * the most visible kind of design-system failure.
 */
export function controlStyle(colours: ThemeColours): CSSProperties {
  return {
    fontFamily: 'inherit',
    fontSize: tokens.typeScale.base,
    color: colours.foreground,
    background: colours.surface,
    border: `1px solid ${colours.border}`,
    borderRadius: tokens.radius.md,
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    width: '100%',
  };
}

/**
 * Focus ring for controls and buttons.
 *
 * Inline styling cannot express `:focus-visible`, so focus is tracked in state.
 * A visible focus indicator is a hard requirement (design-system section 10),
 * so the ring is applied on any focus rather than only keyboard focus. That is
 * a deliberate trade - see limitation L1 in the package README.
 */
export function useControlFocus(colours: ThemeColours): {
  onFocus: () => void;
  onBlur: () => void;
  focusStyle: CSSProperties;
} {
  const [focused, setFocused] = useState(false);

  return {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    focusStyle: focused
      ? {
          outline: `2px solid ${colours.focus}`,
          outlineOffset: '1px',
          borderColor: colours.primary,
        }
      : {},
  };
}
