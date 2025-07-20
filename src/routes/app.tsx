import { authClient } from '@/auth/auth-client'
import { AppNav } from '@/components/app-nav'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { GetSession } from '@/server/get-session'
import { SetActiveOrg } from '@/server/organizations'
import { useAppStore } from '@/store/app'
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
      user: user,
    }
  },
  shouldReload: false,
  component: RouteComponent,
})

function RouteComponent() {
  const { data: org, isPending } = authClient.useActiveOrganization()
  const appStore = useAppStore()

  useEffect(() => {
    if (isPending) return

    if (!org) return

    appStore.setCurrentStore({
      id: org.id,
      name: org.name,
      slug: org.slug,
    })
  }, [isPending, org])

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="flex min-h-screen flex-col">
        <AppNav />

        <main className="container mx-auto px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
