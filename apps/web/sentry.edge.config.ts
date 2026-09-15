import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './sentry.shared';

/**
 * Edge-runtime initialisation, for middleware and edge routes.
 *
 * Separate from the server config because the edge runtime has no Node APIs,
 * and importing anything Node-specific here breaks the build.
 */
Sentry.init(sentryOptions(process.env.SENTRY_DSN));
