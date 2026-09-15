import { defineConfig } from 'vitest/config';

export default defineConfig({
  // esbuild compiles JSX to the automatic runtime, so the tests need no Babel
  // or React plugin.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    restoreMocks: true,
  },
});
