import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './sentry.shared';

/**
 * Browser initialisation.
 *
 * **Why this file name.** On SDK v10 the preferred name is
 * `instrumentation-client.ts`, but that convention requires **Next 15.3+**, and
 * this app is on 15.1.6. Next 15.1.6 does not recognise the file at all - it is
 * ignored silently, which is the worst possible failure for error tracking: the
 * configuration looks present and nothing is ever reported.
 *
 * `sentry.client.config.ts` is the name the Sentry webpack plugin injects on
 * this version. It is marked deprecated, and the rename should happen with the
 * Next upgrade, not before.
 *
 * Verified by asserting the DSN reaches the client bundle - a build succeeding
 * proves nothing here.
 */
Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));
