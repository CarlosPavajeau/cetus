import { AppNav } from '@/components/app-nav'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { GetSession } from '@/server/get-session'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    const { session, user } = await GetSession()

    if (!session) {
      throw redirect({
        to: '/sign-in',
      })
    }

    if (!session.activeOrganizationId) {
      throw redirect({
        to: '/onboarding',
      })
    }

    return {
      activeOrganizationId: session.activeOrganizationId,
      session: session,
      user: user,
    }
  },
  shouldReload: false,
  component: RouteComponent,
})

function RouteComponent() {
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
