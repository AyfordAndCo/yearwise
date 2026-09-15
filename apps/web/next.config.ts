import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

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

/**
 * The commit that produced this build.
 *
 * Sentry needs a release to attribute an error to a deploy, and to record a
 * session at all. Without one it logs "Discarded session because of missing or
 * non-string release" on every request. On Vercel, `SENTRY_RELEASE` or the
 * commit SHA is already present; locally, the working copy answers.
 */
function buildRelease(): string {
  if (process.env.SENTRY_RELEASE !== undefined && process.env.SENTRY_RELEASE !== '') {
    return process.env.SENTRY_RELEASE;
  }
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
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

/**
 * Map the server-side DSN onto the name the browser can see.
 *
 * `next.config` is evaluated before compilation, and Next inlines
 * `process.env.NEXT_PUBLIC_*` during compilation - so assigning it here reaches
 * the client bundle. The `env` config field looks like it should do the same and
 * does **not** reach the Sentry-injected client config, which is how the first
 * attempt shipped a browser SDK with an empty DSN.
 *
 * Keeping one name in `.env` matters: a DSN is public by design, but two names
 * for one value is how they drift.
 */
const dsn = process.env.SENTRY_DSN;
if (dsn !== undefined && dsn !== '') {
  process.env.NEXT_PUBLIC_SENTRY_DSN = dsn;
}

const release = buildRelease();
if (release !== '') {
  process.env.NEXT_PUBLIC_SENTRY_RELEASE = release;
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  /**
   * Source maps upload needs an auth token. Without one the plugin skips the
   * upload, so a clean clone and CI stay green; stack traces are then minified,
   * which is the cost of not holding a token.
   */
  widenClientFileUpload: true,

  // The plugin is chatty about skipped steps. Nothing here is actionable.
  // The plugin is chatty about steps it skipped. Quiet when there is no token to
  // skip with, loud when there is one - a failed upload must not be silent, or
  // production stack traces stay minified and nobody notices.
  silent: process.env.SENTRY_AUTH_TOKEN === undefined,
  telemetry: false,
});
