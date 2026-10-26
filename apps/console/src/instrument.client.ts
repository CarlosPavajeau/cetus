import * as Sentry from "@sentry/tanstackstart-react";

import { scrubLinks } from "../sentry-scrub.mjs";

// Without VITE_SENTRY_DSN at build time, as in development and tests, the SDK stays off. No Session Replay:
// the console shows NITs, customers and certificate passwords.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.PROD ? "production" : "development",
  tracesSampleRate: 0.1,
  beforeSend: scrubLinks,
  beforeSendSpan: scrubLinks,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
  },
  ignoreErrors: [
    "ResizeObserver loop",
    "AbortError",
    "Failed to fetch",
    "NetworkError when attempting to fetch resource",
    "Load failed",
  ],
  denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-(web-)?extension:\/\//],
});
