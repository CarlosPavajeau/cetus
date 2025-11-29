import { api } from '@cetus/api-client'
import {
  orderStatusBadgeVariants,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { OrderSummary } from '@cetus/web/features/orders/components/order-summary'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertCircleIcon,
  CalendarIcon,
  PackageIcon,
  ShoppingBagIcon,
} from 'lucide-react'

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
      <div className="w-full flex-col space-y-4 py-4">
        <div className="flex w-full flex-col space-y-2">
          <div className="flex w-full items-center gap-3">
            <h1 className="font-bold text-2xl text-foreground tracking-tight">
              Orden #{order.orderNumber}
            </h1>
            <Badge
              appearance="outline"
              variant={orderStatusBadgeVariants[order.status]}
            >
              {orderStatusLabels[order.status]}
            </Badge>
          </div>

          <div className="flex items-center text-muted-foreground text-sm">
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            <FormattedDate date={new Date(order.createdAt)} />
          </div>

          {order.status === 'canceled' && order.cancellationReason && (
            <div className="mt-2 flex w-full items-start space-x-2 rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium">
                  Razón: {order.cancellationReason}
                </span>

                {order.cancelledAt && (
                  <span className="mt-0.5 text-xs opacity-90">
                    Cancelado el{' '}
                    <FormattedDate date={new Date(order.cancelledAt)} />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <OrderSummary order={order} />

        <div>
          <Button asChild size="lg">
            <Link to="/">
              <ShoppingBagIcon />
              Seguir comprando
            </Link>
          </Button>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
