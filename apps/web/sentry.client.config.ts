import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './sentry.shared';

/**
 * Browser initialisation.
 *
 * **Known gap as of Next 15.5.25.** The browser SDK is bundled and the client
 * source maps upload, but `process.env.NEXT_PUBLIC_SENTRY_DSN` is replaced with an
 * EMPTY value, so the SDK initialises with no DSN and reports nothing. Verified by
 * grepping the emitted client chunks for the DSN host: it appears only under
 * `.next/server`, never under `.next/static`.
 *
 * On Next 15.1.6 this same file DID inline the DSN. Setting the variable for real
 * in the environment, rather than deriving it in `next.config.ts`, does not change
 * the outcome - so this is a bundling change, not a configuration one.
 *
 * Unaffected and verified working: server-side capture via `onRequestError`, and
 * source-map upload for the Node, Edge and Client runtimes.
 *
 * The likely fix is to stop depending on build-time inlining entirely and
 * initialise on the client from a Server Component prop, which reads
 * `process.env.SENTRY_DSN` at runtime and serialises it into the flight payload.
 *
 * The plugin prints a deprecation warning on every build. That is deliberate: it
 * marks this file as unfinished work, and it stops working under Turbopack.
 */
Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));