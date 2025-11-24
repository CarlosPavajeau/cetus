import { api } from '@cetus/api-client'
import {
  orderStatusColors,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { PageHeader } from '@cetus/web/components/page-header'
import { OrderSummary } from '@cetus/web/features/orders/components/order-summary'
import { cn } from '@cetus/web/shared/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PackageIcon, ShoppingBagIcon } from 'lucide-react'

export const Route = createFileRoute('/orders/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.orders.getById(id),
  })

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
                orderStatusColors[order.status],
              )}
            />
            {orderStatusLabels[order.status]}
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
