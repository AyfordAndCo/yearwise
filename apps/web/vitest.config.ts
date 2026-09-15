import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Matches the `@/*` path alias in tsconfig.json, so tests can import screens
  // by the same specifier the app uses.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
    // Two copies of React in one test run means hooks return null. The app
    // imports primitives as source from packages/ui, which brings its own
    // resolution path, so force a single instance.
    dedupe: ['react', 'react-dom'],
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    restoreMocks: true,
  },
});
