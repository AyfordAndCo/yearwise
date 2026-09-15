'use client';

import { useEffect, useState } from 'react';

/**
 * True when the user has asked for reduced motion.
 *
 * Every animation in this package consults this and collapses to a 1ms
 * transition. Accessibility is a build-time requirement here, not a nicety -
 * see docs/04-design/design-system.md section 10.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
