import { DefaultPageLayout } from '@/components/default-page-layout'
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/products')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DefaultPageLayout showCart>
      <Outlet />
    </DefaultPageLayout>
  )
}
