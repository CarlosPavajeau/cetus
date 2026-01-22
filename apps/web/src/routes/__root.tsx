import { env } from '@cetus/env/client'
import { Toaster } from '@cetus/ui/sonner'
import { TooltipProvider } from '@cetus/ui/tooltip'
import { NotFound } from '@cetus/web/components/not-found'
import { setupApiClient } from '@cetus/web/lib/api/setup'
import appCss from '@cetus/web/styles/index.css?url'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ThemeProvider } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { PostHogProvider } from 'posthog-js/react'
import { type ReactNode, useEffect } from 'react'
import { I18nProvider } from 'react-aria'

type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        name: 'keywords',
        content: 'cetus, ecommerce, store, shop, products',
      },
      {
        title: 'cetus',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

const postHogKey = env.VITE_POSTHOG_KEY
const options = {
  api_host: env.VITE_POSTHOG_HOST,
}

function RootComponent() {
  useEffect(() => {
    setupApiClient()
  }, [])

  return (
    <RootDocument>
      <NuqsAdapter>
        <PostHogProvider apiKey={postHogKey} options={options}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <I18nProvider locale="es-CO">
              <TooltipProvider>
                <Outlet />
                <Toaster />
              </TooltipProvider>
            </I18nProvider>
          </ThemeProvider>
        </PostHogProvider>
      </NuqsAdapter>
    </RootDocument>
  )
}

type RootDocumentProps = {
  children: ReactNode
}

function RootDocument({ children }: Readonly<RootDocumentProps>) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background font-sans antialiased">
        {children}
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
