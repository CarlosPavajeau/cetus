import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

import * as css from '@/styles/index.css?url'

const RootComponent = () => {
  return (
    <main className="min-h-screen">
      <Outlet />
      <TanStackRouterDevtools />
    </main>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        title: 'cetus',
      },
    ],
    link: [{ rel: 'stylesheet', href: css }],
  }),
  component: RootComponent,
})
