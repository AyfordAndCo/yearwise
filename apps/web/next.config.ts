import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @yearwise/ui and @yearwise/logic are consumed as TypeScript source (the
  // ui package formats money through logic), so Next must transpile them rather
  // than resolve them from node_modules output.
  transpilePackages: ['@yearwise/ui', '@yearwise/logic'],
  eslint: {
    // Linting runs as its own Turborepo task; do not couple it to the build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
