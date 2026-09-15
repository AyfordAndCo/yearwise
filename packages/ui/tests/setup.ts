import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// globals are off, so Testing Library's automatic cleanup does not register
// itself. Without this every render leaks into the next test's DOM.
afterEach(() => {
  cleanup();
});
