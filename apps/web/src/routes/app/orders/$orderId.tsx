import { env } from '@cetus/env/client'
import {
  orderStatusBadgeVariants,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Badge } from '@cetus/ui/badge'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { PageHeader } from '@cetus/web/components/page-header'
import { ReturnButton } from '@cetus/web/components/return-button'
import { OrderSummary } from '@cetus/web/features/orders/components/order-summary'
import { UpdateOrderStatusButton } from '@cetus/web/features/orders/components/update-order-status-button'
import { orderQueries } from '@cetus/web/features/orders/queries'
import {
  useClientMethod,
  useHub,
  useHubGroup,
} from '@cetus/web/hooks/realtime/use-hub'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AlertCircleIcon, CalendarIcon } from 'lucide-react'

const REALTIME_URL = `${env.VITE_API_URL}/realtime/orders`

export const Route = createFileRoute('/app/orders/$orderId')({
  component: OrderDetailsComponent,
})

function useRealtimeOrderUpdates(orderId: string) {
  const { connection } = useHub(REALTIME_URL)
  const queryClient = useQueryClient()

  useHubGroup(connection, 'JoinOrderGroup', orderId)

  useClientMethod(connection, 'ReceiveUpdatedOrder', () => {
    queryClient.invalidateQueries({
      queryKey: ['orders', orderId],
    })
  })

  return connection
}

function OrderDetailsComponent() {
  const { orderId } = Route.useParams()
  const { data: order, isLoading } = useQuery(orderQueries.detail(orderId))

  useRealtimeOrderUpdates(orderId)

  if (isLoading) {
    return <DefaultLoader />
  }

  if (!order) {
    return (
      <PageHeader
        subtitle="No se pudo encontrar el pedido solicitado."
        title="Pedido no encontrado"
      />
    )
  }

  return (
    <div>
      <div className="px-4 pb-4 sm:px-6 lg:px-8">
        <div className="sticky top-0 z-10 space-y-4 py-4 backdrop-blur-md">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <ReturnButton />
              </div>

              <div className="flex items-center gap-3">
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
            </div>

            <div className="flex flex-col items-baseline justify-end">
              <UpdateOrderStatusButton order={order} />
            </div>
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
      </div>
    </div>
  )
}
