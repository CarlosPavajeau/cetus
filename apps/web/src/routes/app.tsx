import { api } from '@cetus/api-client'
import { AppNav } from '@cetus/web/components/app-nav'
import { AppSidebar } from '@cetus/web/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@cetus/web/components/ui/sidebar'
import { getSession } from '@cetus/web/functions/get-session'
import { setActiveOrg } from '@cetus/web/functions/organizations'
import { setStoreSlug } from '@cetus/web/functions/store-slug'
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
  beforeLoad: async ({ context }) => {
    const session = await getSession()

    if (!session) {
      throw redirect({
        to: '/sign-in',
      })
    }

    setupApiClient()

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

    const store = await context.queryClient.ensureQueryData(
      storeByExternalIdQuery(organizationId),
    )

    await setStoreSlug({
      data: {
        slug: store.slug,
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

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <AppNav />

        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
