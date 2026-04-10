import { getCurrentStoreId } from '@cetus/web/functions/store-slug'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

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
  return <Outlet />
}
