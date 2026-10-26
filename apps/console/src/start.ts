import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react";
import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

import { comesThroughEdge } from "./lib/edge";

/** Refuses whatever reached Railway without passing through Cloudflare (see lib/edge.ts). */
const edgeMiddleware = createMiddleware().server(({ request, next }) => {
  if (
    !comesThroughEdge(request, process.env.CETUS_EDGE_SECRET, process.env.NODE_ENV === "production")
  ) {
    return new Response("Forbidden", { status: 403 });
  }
  return next();
});

// Defining the start instance replaces Start's default CSRF check on server functions, so it is listed here.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Sentry's go first, so they see what the others throw.
export const startInstance = createStart(() => ({
  requestMiddleware: [sentryGlobalRequestMiddleware, edgeMiddleware, csrfMiddleware],
  functionMiddleware: [sentryGlobalFunctionMiddleware],
}));
