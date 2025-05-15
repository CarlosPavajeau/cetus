import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderSummary } from '@/components/order/order-summary'
import { Button } from '@/components/ui/button'
import { useOrder } from '@/hooks/orders'
import { Link, createFileRoute } from '@tanstack/react-router'
import { PackageIcon, ShoppingBagIcon } from 'lucide-react'

export const Route = createFileRoute('/orders/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { order, isLoading } = useOrder(id)

  if (isLoading) {
    return (
      <DefaultPageLayout>
        <DefaultLoader />
      </DefaultPageLayout>
    )
  }

  if (!order) {
    return (
      <DefaultPageLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-6">
            <PackageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="mb-2 font-semibold text-xl">Pedido no encontrado</h2>
          <p className="mb-6 text-muted-foreground">
            El pedido que buscas no existe o ha sido eliminado
          </p>

          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <ShoppingBagIcon className="mr-2" />
              Volver a la tienda
            </Link>
          </Button>
        </div>
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Pedido #{order.orderNumber}</h2>
        </div>

        <OrderSummary order={order} />

        <div className="space-y-3">
          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <ShoppingBagIcon className="mr-2" />
              Seguir comprando
            </Link>
          </Button>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
