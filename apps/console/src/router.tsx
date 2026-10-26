import * as Sentry from "@sentry/tanstackstart-react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { RouteError } from "./components/RouteError";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // One client per router: on the server getRouter runs per request, so the cache is never shared between users.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    // Freshness is Query's job: let every preload reach ensureQueryData and its staleTime.
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
  });

  // Dehydrates the server cache into the HTML, hydrates it on the client and wraps the app in QueryClientProvider.
  setupRouterSsrQueryIntegration({ router, queryClient });

  if (!router.isServer) {
    Sentry.addIntegration(Sentry.tanstackRouterBrowserTracingIntegration(router));
  }

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
