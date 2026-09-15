/**
 * Design tokens.
 *
 * Light-first, green accent (decision D7). A single source of truth for colour,
 * spacing, radius, type, elevation and motion, consumed by the primitives in
 * this package. `apps/web` maps these values into Tailwind so utilities and
 * primitives cannot disagree.
 *
 * Colours are semantic and split by theme. A component never hardcodes a hex
 * value; it asks for `surface`, `moneyOut` or `focus` and receives the current
 * theme's value. Dark mode is a token swap, not a style branch.
 *
 * See docs/04-design/design-system.md.
 */

export type Theme = 'light' | 'dark';

const lightColours = {
  // Surfaces
  background: '#ffffff',
  surface: '#f7f7f5',
  raised: '#ffffff',
  overlay: 'rgba(26, 26, 26, 0.45)',

  // Text
  foreground: '#1a1a1a',
  muted: '#6b6b6b',
  disabled: '#a3a3a0',

  // Lines
  border: '#e2e2dd',
  borderStrong: '#cbc8bd',

  // Brand and interaction. Green means "interactive", never "money".
  primary: '#1f6f5c',
  primaryHover: '#185a4a',
  primaryActive: '#114438',
  primaryContrast: '#ffffff',
  focus: '#1f6f5c',
  tint: 'rgba(31, 111, 92, 0.10)',

  // Money semantics. Always paired with a sign glyph, never colour alone.
  moneyIn: '#1e8449',
  moneyInDim: 'rgba(30, 132, 73, 0.10)',
  moneyOut: '#c0392b',
  moneyOutDim: 'rgba(192, 57, 43, 0.10)',

  // Status
  info: '#1d6fb8',
  infoDim: 'rgba(29, 111, 184, 0.10)',
  success: '#1e8449',
  successDim: 'rgba(30, 132, 73, 0.10)',
  warning: '#9a6212',
  warningDim: 'rgba(154, 98, 18, 0.12)',
  danger: '#b03a2e',
  dangerDim: 'rgba(176, 58, 46, 0.10)',
} as const;

const darkColours = {
  background: '#101110',
  surface: '#1a1b1a',
  raised: '#232522',
  overlay: 'rgba(0, 0, 0, 0.60)',

  foreground: '#f2f2ef',
  muted: '#9a9a94',
  disabled: '#5e605c',

  border: '#2b2c2a',
  borderStrong: '#3d3f3d',

  primary: '#3a9b83',
  primaryHover: '#4bb394',
  primaryActive: '#2d7d69',
  primaryContrast: '#0b0c0b',
  focus: '#3a9b83',
  tint: 'rgba(58, 155, 131, 0.16)',

  moneyIn: '#4ade80',
  moneyInDim: 'rgba(74, 222, 128, 0.14)',
  moneyOut: '#f87171',
  moneyOutDim: 'rgba(248, 113, 113, 0.14)',

  info: '#6fa8dc',
  infoDim: 'rgba(111, 168, 220, 0.16)',
  success: '#4ade80',
  successDim: 'rgba(74, 222, 128, 0.14)',
  warning: '#d9a441',
  warningDim: 'rgba(217, 164, 65, 0.16)',
  danger: '#e0735c',
  dangerDim: 'rgba(224, 115, 92, 0.16)',
} as const;

const elevation = {
  light: {
    raised: '0 1px 2px rgba(16, 24, 40, 0.06)',
    floating: '0 8px 24px rgba(16, 24, 40, 0.12)',
  },
  dark: {
    raised: '0 1px 2px rgba(0, 0, 0, 0.40)',
    floating: '0 8px 24px rgba(0, 0, 0, 0.45)',
  },
} as const;

export const tokens = {
  colour: {
    light: lightColours,
    dark: darkColours,
  },
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
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.5rem',
    '2xl': '2rem',
  },
  elevation,
  motion: {
    duration: {
      instant: '80ms',
      fast: '140ms',
      base: '200ms',
      slow: '320ms',
    },
    easing: {
      out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
} as const;

export type ThemeColours = (typeof tokens.colour)[Theme];
export type ThemeElevation = (typeof tokens.elevation)[Theme];
