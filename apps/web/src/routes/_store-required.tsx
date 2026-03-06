import { getCurrentStoreId } from '@cetus/web/functions/store-slug'
import { setupApiClient } from '@cetus/web/lib/api/setup'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/_store-required')({
  loader: async () => {
    const store = getCurrentStoreId()

    if (!store) {
      throw redirect({
        to: '/',
      })
    }

    return { store }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { store } = Route.useLoaderData()

  useEffect(() => {
    setupApiClient(store)
  }, [store])

  return <Outlet />
}
