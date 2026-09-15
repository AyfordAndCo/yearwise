import * as Sentry from '@sentry/nextjs';

/**
 * Next.js instrumentation hook, run once per server runtime at boot.
 *
 * `onRequestError` is the part that matters: Next routes every server-side error
 * through it - route handlers, server components, server actions - including the
 * ones a React error boundary never sees, because they happen before render.
 * Without it, a failing `/api/accounts` would be invisible to Sentry.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
