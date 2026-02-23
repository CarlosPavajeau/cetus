import { env } from '@cetus/env/client'
import { Toaster } from '@cetus/ui/sonner'
import { TooltipProvider } from '@cetus/ui/tooltip'
import { ThemeProvider } from '@cetus/web/hooks/use-theme'
import appCss from '@cetus/web/styles/index.css?url'
import interLatinFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'
import outfitLatinFont from '@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2?url'
import { PostHogProvider } from '@posthog/react'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
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
  component: RootDocument,
})

const postHogKey = env.VITE_POSTHOG_KEY
const postHogOptions = {
  api_host: env.VITE_POSTHOG_HOST,
  defaults: '2026-01-30',
} as const

function RootDocument() {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Anti-flash: set correct theme class before CSS/React hydrate */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional anti-flash inline script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cetus-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <NuqsAdapter>
            <PostHogProvider apiKey={postHogKey} options={postHogOptions}>
              <I18nProvider locale="es-CO">
                <TooltipProvider>
                  <Outlet />
                  <Toaster />
                </TooltipProvider>
              </I18nProvider>
            </PostHogProvider>
          </NuqsAdapter>
        </ThemeProvider>

        <TanStackDevtools
          config={{
            position: 'middle-left',
          }}
          plugins={[
            {
              name: 'TanStack Query',
              render: <ReactQueryDevtoolsPanel />,
              defaultOpen: true,
            },
            {
              name: 'TanStack Router',
              render: <TanStackRouterDevtoolsPanel />,
              defaultOpen: false,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
