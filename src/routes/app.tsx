import { AccessDenied } from '@/components/access-denied'
import { AppNav } from '@/components/app-nav'
import { Protect } from '@clerk/clerk-react'
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <section>
      <AppNav />

      <div className="container mx-auto">
        <Protect permission="org:app:access" fallback={<AccessDenied />}>
          <Outlet />
        </Protect>
      </div>
    </section>
  )
}
