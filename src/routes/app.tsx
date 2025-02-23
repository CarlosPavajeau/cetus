import { AppNav } from '@/components/app-nav'
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <section>
      <AppNav />

      <div className="container mx-auto">
        <Outlet />
      </div>
    </section>
  )
}
