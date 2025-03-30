import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { HeadContent, Outlet, createRootRoute } from '@tanstack/react-router'

import React, { Suspense } from 'react'

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : React.lazy(() =>
      // Lazy load in development
      import('@tanstack/router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
        // For Embedded Mode
        // default: res.TanStackRouterDevtoolsPanel
      })),
    )

const RootComponent = () => {
  return (
    <div className="before:-left-12 after:-right-12 relative mx-auto w-full max-w-6xl before:absolute before:inset-y-0 before:w-px before:bg-[linear-gradient(to_bottom,--theme(--color-border/.3),--theme(--color-border)_200px,--theme(--color-border)_calc(100%-200px),--theme(--color-border/.3))] after:absolute after:inset-y-0 after:w-px after:bg-[linear-gradient(to_bottom,--theme(--color-border/.3),--theme(--color-border)_200px,--theme(--color-border)_calc(100%-200px),--theme(--color-border/.3))]">
      <div className="relative flex min-h-screen flex-col">
        <HeadContent />
        <TooltipProvider>
          <Outlet />
          <Toaster />
          <Suspense>
            <TanStackRouterDevtools />
          </Suspense>
        </TooltipProvider>
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
        name: 'keywords',
        content: 'TELEDIGITAL JYA, ecommerce, store, shop, products',
      },
      {
        title: 'TELEDIGITAL JYA',
      },
    ],
  }),
  component: RootComponent,
})
