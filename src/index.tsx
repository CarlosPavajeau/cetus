import { RouterProvider, createRouter } from '@tanstack/react-router'
import { ThemeProvider } from 'next-themes'
import React from 'react'
import { I18nProvider } from 'react-aria'
import ReactDOM from 'react-dom/client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthInterceptor } from './components/auth-interceptor'
import { ClerkProvider } from './components/clerk-provider'
import { routeTree } from './routeTree.gen'

import './styles/index.css'

const router = createRouter({ routeTree })

const rootElement = document.getElementById('root')

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement)
  const queryClient = new QueryClient()

  root.render(
    <React.StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <I18nProvider locale="es-CO">
          <ClerkProvider>
            <QueryClientProvider client={queryClient}>
              <RouterProvider router={router} />
              <ReactQueryDevtools initialIsOpen={false} />
              <AuthInterceptor />
            </QueryClientProvider>
          </ClerkProvider>
        </I18nProvider>
      </ThemeProvider>
    </React.StrictMode>,
  )
}
