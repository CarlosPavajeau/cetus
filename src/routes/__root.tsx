import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { HeadContent, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { Suspense } from 'react'

const RootComponent = () => {
  return (
    <>
      <HeadContent />
      <TooltipProvider>
        <Outlet />
        <Toaster />
        <Suspense>
          <TanStackRouterDevtools />
        </Suspense>
      </TooltipProvider>
    </>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
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
