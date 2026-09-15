import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

/**
 * Load the repository-root `.env`.
 *
 * Next loads `.env` from the app directory, which in a monorepo is `apps/web`.
 * The single source of configuration is the repository root (`.env.example`
 * documents it), so it is loaded explicitly rather than duplicated per app -
 * duplicating secrets across packages is how they drift.
 *
 * A no-op where the file is absent, which is the case on Vercel: there,
 * environment variables come from the platform.
 */
const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const nextConfig: NextConfig = {
  // These workspace packages are consumed as TypeScript source, so Next must
  // transpile them rather than resolve them from node_modules output.
  transpilePackages: ['@yearwise/ui', '@yearwise/logic', '@yearwise/types', '@yearwise/database'],
  eslint: {
    // Linting runs as its own Turborepo task; do not couple it to the build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
