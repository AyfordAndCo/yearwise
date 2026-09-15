import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        overlay: 'var(--overlay)',

        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        disabled: 'var(--disabled)',

        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',

        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-active': 'var(--primary-active)',
        'primary-contrast': 'var(--primary-contrast)',
        focus: 'var(--focus)',
        tint: 'var(--tint)',

        'money-in': 'var(--money-in)',
        'money-out': 'var(--money-out)',

        info: 'var(--info)',
        'info-dim': 'var(--info-dim)',
        success: 'var(--success)',
        'success-dim': 'var(--success-dim)',
        warning: 'var(--warning)',
        'warning-dim': 'var(--warning-dim)',
        danger: 'var(--danger)',
        'danger-dim': 'var(--danger-dim)',
      },
    },
  },
  plugins: [],
};

export default config;
