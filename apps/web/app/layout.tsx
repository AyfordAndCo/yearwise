import type { Metadata } from 'next';
import { ThemeProvider } from '@yearwise/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yearwise',
  description:
    'A life operating system for money, budgets, debts, savings, tasks, habits and meals.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
