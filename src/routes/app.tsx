import { AccessDenied } from '@/components/access-denied'
import { AppNav } from '@/components/app-nav'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Protect, RedirectToSignIn } from '@clerk/tanstack-react-start'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ context }) => {
    if (!context.userId) {
      throw new Error('Not authenticated')
    }
  },
  shouldReload: false,
  errorComponent: ({ error }) => {
    if (error.message === 'Not authenticated') {
      return (
        <div className="flex items-center justify-center p-12">
          <RedirectToSignIn />
        </div>
      )
    }

    throw error
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset className="flex min-h-screen flex-col">
          <AppNav />

          <main className="container mx-auto px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </Protect>
  )
}
