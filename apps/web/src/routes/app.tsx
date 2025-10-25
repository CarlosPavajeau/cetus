import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import { fetchStoreByExternalId } from '@/api/stores'
import { AppNav } from '@/components/app-nav'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getSession } from '@/functions/get-session'
import { setActiveOrg } from '@/functions/organizations'
import { useTenantStore } from '@/store/use-tenant-store'

const storeByExternalIdQuery = (id: string) =>
  queryOptions({
    queryKey: ['store', 'external', id],
    queryFn: () => fetchStoreByExternalId(id),
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
