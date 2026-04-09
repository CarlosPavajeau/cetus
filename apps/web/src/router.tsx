import { DefaultCatchBoundary } from '@cetus/web/components/default-catch-boundary'
import { NotFound } from '@cetus/web/components/not-found'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient()

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPendingMinMs: 0,
    defaultPendingMs: 0,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => <NotFound />,
    defaultErrorComponent: DefaultCatchBoundary,
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  })

  return router
}
