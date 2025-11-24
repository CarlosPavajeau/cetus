import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_store-required')({
  component: RouteComponent,
})

function RouteComponent() {
  const { store, status } = useTenantStore()

  if (status === 'idle' || status === 'loading') {
    return null
  }

  if (!store) {
    return <Navigate search={{ redirectReason: 'NO_STORE_SELECTED' }} to="/" />
  }

  return <Outlet />
}
