import { authClient } from '@/auth/auth-client'
import { AppNav } from '@/components/app-nav'
import { AppSidebar } from '@/components/app-sidebar'
import { MissingMercadoPagoConfigurationBanner } from '@/components/missing-mercado-pago-configuration-banner'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useStoreBySlug } from '@/hooks/stores'
import { GetSession } from '@/server/get-session'
import { SetActiveOrg } from '@/server/organizations'
import { useTenantStore } from '@/store/use-tenant-store'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    const { session, user } = await GetSession()

    if (!session) {
      throw redirect({
        to: '/sign-in',
      })
    }

    if (!session.activeOrganizationId) {
      const activeOrg = await SetActiveOrg()
      if (!activeOrg) {
        throw redirect({
          to: '/onboarding',
        })
      }
    }

    return {
      user,
    }
  },
  shouldReload: false,
  component: RouteComponent,
})

function RouteComponent() {
  const { data: org, isPending } = authClient.useActiveOrganization()
  const { store, isLoading } = useStoreBySlug(org?.slug)
  const tenantStore = useTenantStore()

  useEffect(() => {
    if (isPending || isLoading) {
      return
    }

    if (!org) {
      return
    }

    if (!store) {
      return
    }

    tenantStore.actions.setStore(store)
  }, [isPending, org, store, isLoading])

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="flex min-h-screen flex-col">
        <AppNav />

        <MissingMercadoPagoConfigurationBanner />

        <main className="container mx-auto px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
