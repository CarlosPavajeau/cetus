import { OrderStatusColor, OrderStatusText } from '@/api/orders'
import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderSummary } from '@/components/order/order-summary'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOrder } from '@/hooks/orders'
import { cn } from '@/shared/cn'
import { createFileRoute, Link } from '@tanstack/react-router'
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

          <Button asChild className="w-full" variant="outline">
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
        <PageHeader title={`Pedido #${order.orderNumber}`} />

        <div className="space-y-3">
          <Badge variant="outline">
            <span
              aria-hidden="true"
              className={cn(
                'size-1.5 rounded-full',
                OrderStatusColor[order.status],
              )}
            />
            {OrderStatusText[order.status]}
          </Badge>

          <OrderSummary isCustomer order={order} />
        </div>

        <Button asChild className="w-full" size="lg">
          <Link to="/">
            <ShoppingBagIcon />
            Seguir comprando
          </Link>
        </Button>
      </div>
    </DefaultPageLayout>
  )
}
