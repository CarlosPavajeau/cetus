import { AuthInterceptor } from '@/components/auth-interceptor'
import { ClerkProvider } from '@/components/clerk-provider'
import { NotFound } from '@/components/not-found'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import appCss from '@/styles/index.css?url'
import { getAuth } from '@clerk/tanstack-react-start/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { ThemeProvider } from 'next-themes'
import { PostHogProvider } from 'posthog-js/react'
import type { ReactNode } from 'react'
import { I18nProvider } from 'react-aria'

const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId, orgId, orgSlug } = await getAuth(getWebRequest()!)

  return {
    userId,
    orgId,
    orgSlug,
  }
})

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  beforeLoad: async () => {
    const user = await fetchClerkAuth()

    return user
  },
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
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Outfit:wght@100..900&display=swap',
      },
    ],
  }),
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

const postHogKey = import.meta.env.VITE_POSTHOG_KEY
const options = {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
}

function RootComponent() {
  const queryClient = new QueryClient()

  return (
    <RootDocument>
      <PostHogProvider apiKey={postHogKey} options={options}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider locale="es-CO">
            <ClerkProvider>
              <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                  <Outlet />
                  <Toaster />
                  <AuthInterceptor />
                </TooltipProvider>
              </QueryClientProvider>
            </ClerkProvider>
          </I18nProvider>
        </ThemeProvider>
      </PostHogProvider>
    </RootDocument>
  )
}

type RootDocumentProps = {
  children: ReactNode
}

function RootDocument({ children }: RootDocumentProps) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background font-sans antialiased">
        {children}
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-left" />
        <Scripts />
      </body>
    </html>
  )
}
