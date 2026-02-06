import { env } from '@cetus/env/client'
import { Toaster } from '@cetus/ui/sonner'
import { TooltipProvider } from '@cetus/ui/tooltip'
import { NotFound } from '@cetus/web/components/not-found'
import { setupApiClient } from '@cetus/web/lib/api/setup'
import appCss from '@cetus/web/styles/index.css?url'
import interLatinFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'
import outfitLatinFont from '@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2?url'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { ThemeProvider } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import {
  type ComponentType,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useState,
} from 'react'
import { I18nProvider } from 'react-aria'

// bundle-dynamic-imports: Devtools only loaded in development
const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )

const ReactQueryDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )

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
    links: [
      {
        rel: 'preload',
        href: interLatinFont,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: outfitLatinFont,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

const postHogKey = env.VITE_POSTHOG_KEY
const postHogOptions = {
  api_host: env.VITE_POSTHOG_HOST,
}

// bundle-defer-third-party: Defer analytics loading until after first paint
function DeferredAnalytics({ children }: { children: ReactNode }) {
  const [Provider, setProvider] = useState<ComponentType<{
    apiKey: string
    options: Record<string, string>
    children: ReactNode
  }> | null>(null)

  useEffect(() => {
    if (!postHogKey) {
      return
    }

    import('posthog-js/react').then((mod) => {
      setProvider(() => mod.PostHogProvider)
    })
  }, [])

  if (!Provider) {
    return <>{children}</>
  }

  return (
    <Provider apiKey={postHogKey} options={postHogOptions}>
      {children}
    </Provider>
  )
}

function RootComponent() {
  useEffect(() => {
    setupApiClient()
  }, [])

  return (
    <RootDocument>
      <NuqsAdapter>
        <DeferredAnalytics>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <I18nProvider locale="es-CO">
              <TooltipProvider>
                <Outlet />
                <Toaster />
              </TooltipProvider>
            </I18nProvider>
          </ThemeProvider>
        </DeferredAnalytics>
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
        <Suspense>
          <TanStackRouterDevtools position="top-right" />
          <ReactQueryDevtools buttonPosition="top-right" />
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
}
