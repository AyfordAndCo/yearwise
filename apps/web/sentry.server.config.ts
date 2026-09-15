import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './sentry.shared';

/**
 * Server-side initialisation: route handlers, server components, server actions.
 *
 * Loaded from `instrumentation.ts`, only when `NEXT_RUNTIME === 'nodejs'`.
 */
Sentry.init(sentryOptions(process.env.SENTRY_DSN));
