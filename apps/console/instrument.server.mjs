// Sentry on the console server, loaded with `node --import` before anything else (package.json "start").
// Without SENTRY_DSN, as in development and tests, the SDK stays off.
import * as Sentry from "@sentry/tanstackstart-react";

import { scrubLinks } from "./sentry-scrub.mjs";

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.CETUS_DEPLOYMENT_ENV ?? "development",
    release: process.env.CETUS_COMMIT_SHA,
    beforeSend: scrubLinks,
    beforeSendSpan: scrubLinks,
    tracesSampler: ({ name, inheritOrSampleWith }) =>
        name.includes("/.well-known/")
            ? 0
            : inheritOrSampleWith(Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1)),
    // The API continues the console's traces in Grafana with the W3C header; nothing else gets them.
    propagateTraceparent: true,
    tracePropagationTargets: process.env.CETUS_API_URL ? [process.env.CETUS_API_URL] : [],
    // Server functions carry certificates, their passwords and DIAN PINs; requests carry the session.
    dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        stackFrameVariables: false,
    },
});
