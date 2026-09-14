import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @yearwise/ui is consumed as TypeScript source (like @yearwise/logic), so
  // Next must transpile it rather than resolve it from node_modules output.
  transpilePackages: ['@yearwise/ui'],
  eslint: {
    // Linting runs as its own Turborepo task; do not couple it to the build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
