import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/products')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <section>
      <div className="container mx-auto">
        <Outlet />
      </div>
    </section>
  )
}
