/**
 * Design tokens.
 *
 * Phase 0 proves the token pipeline, not the design system: a single source of
 * truth for colour, spacing, radius and type, consumed by the primitives in
 * this package. Tailwind in apps/web maps these values when real screens
 * arrive in Phase 1 (see docs/04-design/design-system.md).
 *
 * Colours are semantic and split by theme. A component never hardcodes a hex
 * value; it asks for `surface` or `primary` and receives the current theme's
 * value. Dark mode is therefore a token swap, not a style branch.
 */

export type Theme = 'light' | 'dark';

const colour = {
  light: {
    background: '#ffffff',
    surface: '#f7f7f5',
    text: '#1a1a1a',
    muted: '#6b6b6b',
    border: '#e2e2dd',
    primary: '#1f6f5c',
    primaryContrast: '#ffffff',
    focus: '#1f6f5c',
  },
  dark: {
    background: '#101110',
    surface: '#1a1b1a',
    text: '#f2f2ef',
    muted: '#9a9a94',
    border: '#2b2c2a',
    primary: '#3a9b83',
    primaryContrast: '#0b0c0b',
    focus: '#3a9b83',
  },
} as const;

export const tokens = {
  colour,
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  typeScale: {
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.5rem',
  },
} as const;

export type ThemeColours = (typeof tokens.colour)[Theme];
