'use client';

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { tokens } from './tokens';
import type { Theme, ThemeColours } from './tokens';

export interface ThemeContextValue {
  theme: Theme;
  colours: ThemeColours;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = 'light',
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const value: ThemeContextValue = {
    theme,
    colours: tokens.colour[theme],
    setTheme,
  };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
