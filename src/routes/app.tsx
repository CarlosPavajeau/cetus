import { AccessDenied } from '@/components/access-denied'
import { AppNav } from '@/components/app-nav'
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
      <Protect permission="org:app:access" fallback={<AccessDenied />}>
        <SignedIn>
          <section>
            <AppNav />

            <div className="container mx-auto">
              <Outlet />
            </div>
          </section>
        </SignedIn>

        <SignedOut>
          <RedirectToSignIn />
        </SignedOut>
      </Protect>
    </ClerkLoaded>
  )
}
