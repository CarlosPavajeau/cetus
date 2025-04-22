import { AccessDenied } from '@/components/access-denied'
import { AppNav } from '@/components/app-nav'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import {
  ClerkLoaded,
  Protect,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
} from '@clerk/clerk-react'
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <ClerkLoaded>
      <SignedIn>
        <Protect permission="org:app:access" fallback={<AccessDenied />}>
          <SidebarProvider>
            <AppSidebar />

            <SidebarInset className="overflow-hidden px-4 md:px-6 lg:px-8">
              <AppNav />

              <div className="flex flex-1 flex-col gap-4 py-4 lg:gap-6 lg:py-6">
                <Outlet />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </Protect>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </ClerkLoaded>
  )
}
