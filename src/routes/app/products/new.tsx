import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/products/new')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/products/new"!</div>
}
