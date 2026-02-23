import { api } from '@cetus/api-client'
import { AppNav } from '@cetus/web/components/app-nav'
import { AppSidebar } from '@cetus/web/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@cetus/web/components/ui/sidebar'
import { QuickSaleProvider } from '@cetus/web/features/quick-sales/components/quick-sale-provider'
import { getSession } from '@cetus/web/functions/get-session'
import { setActiveOrg } from '@cetus/web/functions/organizations'
import { setStoreId } from '@cetus/web/functions/store-slug'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import { setupApiClient } from '../lib/api/setup'

const storeByExternalIdQuery = (id: string) =>
  queryOptions({
    queryKey: ['store', 'external', id],
    queryFn: () => api.stores.getByExternalId(id),
    staleTime: 300_000,
  })

export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    const session = await getSession()

    if (!session) {
      throw redirect({
        to: '/sign-in',
      })
    }

    let organizationId = session.session.activeOrganizationId
    if (!organizationId) {
      const activeOrg = await setActiveOrg()
      if (!activeOrg) {
        throw redirect({
          to: '/onboarding',
        })
      }

      organizationId = activeOrg.id
    }

    return {
      session,
      organizationId,
    }
  },
  loader: async ({ context }) => {
    setupApiClient()

    const { session, organizationId } = context

    const store = await context.queryClient.ensureQueryData(
      storeByExternalIdQuery(organizationId),
    )

    setStoreId({
      data: {
        id: store.id,
      },
    })

    return {
      user: session.user,
      store,
      organizationId,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { organizationId } = Route.useRouteContext()
  const { data: store } = useSuspenseQuery(
    storeByExternalIdQuery(organizationId),
  )
  const { actions } = useTenantStore()

  useEffect(() => {
    actions.setStore(store)
  }, [store, actions])

  useEffect(() => {
    setupApiClient()
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <AppNav />

        <main className="flex flex-1 flex-col gap-4">
          <Outlet />
        </main>
      </SidebarInset>

      <QuickSaleProvider />
    </SidebarProvider>
  )
}
