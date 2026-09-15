import type { ReactNode } from 'react';

/**
 * The content well. Owns max width and gutters so screens do not each invent
 * their own spacing.
 */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-8">{children}</div>;
}
