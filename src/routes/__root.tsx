import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

import * as css from '@/styles/index.css?url'

const RootComponent = () => {
  return (
    <div className="before:-left-12 after:-right-12 relative mx-auto w-full max-w-6xl before:absolute before:inset-y-0 before:w-px before:bg-[linear-gradient(to_bottom,--theme(--color-border/.3),--theme(--color-border)_200px,--theme(--color-border)_calc(100%-200px),--theme(--color-border/.3))] after:absolute after:inset-y-0 after:w-px after:bg-[linear-gradient(to_bottom,--theme(--color-border/.3),--theme(--color-border)_200px,--theme(--color-border)_calc(100%-200px),--theme(--color-border/.3))]">
      <div className="relative flex min-h-screen flex-col">
        <Outlet />
        <TanStackRouterDevtools />
      </div>
    </div>
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
