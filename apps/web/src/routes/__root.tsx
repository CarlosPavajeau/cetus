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
import { PostHogProvider } from 'posthog-js/react'
import type { ReactNode } from 'react'
import { I18nProvider } from 'react-aria'
import { NotFound } from '@/components/not-found'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import appCss from '@/styles/index.css?url'

import '@fontsource-variable/inter'
import '@fontsource-variable/outfit'
import { env } from '@cetus/env/client'

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
  return (
    <RootDocument>
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
        <TanStackRouterDevtools position="top-right" />
        <ReactQueryDevtools buttonPosition="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
