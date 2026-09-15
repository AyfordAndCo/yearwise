/**
 * Options shared by the three runtimes.
 *
 * A function rather than a constant, because the DSN arrives under a different
 * name in each: `SENTRY_DSN` on the server and edge, `NEXT_PUBLIC_SENTRY_DSN` in
 * the browser, where only `NEXT_PUBLIC_` variables are inlined at build time.
 * `next.config.ts` maps one to the other, so the value is never duplicated.
 */
export function sentryOptions(dsn: string | undefined) {
  const configured = typeof dsn === 'string' && dsn !== '';

  return {
    dsn,

    /**
     * Off when there is no DSN. That keeps a clean clone, a test run and a CI
     * build working without secrets, and stops the SDK from logging a
     * "no DSN provided" warning on every boot.
     */
    enabled: configured,

    environment: process.env.NODE_ENV,
    /**
     * Inlined by `next.config.ts` from the build's commit, on both runtimes.
     * Sessions are discarded without one, so this also silences a warning on
     * every request.
     */
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    /**
     * Set `SENTRY_DEBUG=1` to watch the SDK decide what to send. The only way to
     * see that an event left the process, since the dashboard needs an auth
     * token this repository does not hold.
     */
    debug: process.env.SENTRY_DEBUG === '1',

    /**
     * Errors only. Performance tracing costs quota and answers a question
     * nobody has asked yet, so it is sampled rather than enabled; Phase 0's
     * deliverable is an error-tracking floor, not APM.
     */
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

    /**
     * Never send a request body or a cookie to a third party. A ledger's
     * payloads contain amounts and payees, and nothing here needs them.
     */
    sendDefaultPii: false,

    // Noise: these arrive from browser extensions and from Next's own
    // prefetching, and neither is actionable.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /^NEXT_NOT_FOUND$/,
      /^NEXT_REDIRECT$/,
    ],
  };
}
