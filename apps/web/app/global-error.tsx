'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * The App Router's last line of defence for a render error.
 *
 * It replaces the root layout, so it must render its own `<html>` and `<body>`,
 * and it cannot rely on the app's providers or stylesheet. Styles are kept
 * inline for that reason.
 *
 * `onRequestError` in `instrumentation.ts` covers server-side failures; this
 * covers a component that threw while rendering in the browser.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-ZA">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#ffffff',
          color: '#1a1a1a',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <main style={{ maxWidth: '28rem', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.9375rem', color: '#6b6b6b' }}>
            The problem has been reported. Nothing you have already recorded is lost.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: 'inherit',
              fontWeight: 600,
              color: '#ffffff',
              background: '#1f6f5c',
              border: '1px solid #1f6f5c',
              borderRadius: '0.375rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
