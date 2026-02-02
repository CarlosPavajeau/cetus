import { env } from '@cetus/env/client'
import {
  orderStatusColors,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Badge } from '@cetus/ui/badge'
import { Separator } from '@cetus/ui/separator'
import { Currency } from '@cetus/web/components/currency'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { FormattedDate } from '@cetus/web/components/formatted-date'
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
import { AlertCircleIcon, CalendarIcon, MapPinIcon } from 'lucide-react'

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
}

function OrderDetailsComponent() {
  const { orderId } = Route.useParams()
  const { data: order, isLoading } = useQuery(orderQueries.detail(orderId))

  useRealtimeOrderUpdates(orderId)

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <DefaultLoader />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="font-bold text-2xl tracking-tight">
          Pedido no encontrado
        </h1>
        <p className="text-muted-foreground text-sm">
          No se pudo encontrar el pedido solicitado.
        </p>
      </div>
    )
  }

  const statusColor = orderStatusColors[order.status]

  return (
    <div>
      <div className="px-4 pb-4 sm:px-6 lg:px-8">
        <div className="sticky top-0 z-10 space-y-4 py-4 backdrop-blur-md">
          <ReturnButton />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-2xl text-foreground tracking-tight">
                Orden #{order.orderNumber}
              </h1>
              <Badge
                className="border-transparent"
                style={{
                  backgroundColor: statusColor.replace(')', ' / 0.15)'),
                  color: statusColor,
                }}
              >
                {orderStatusLabels[order.status]}
              </Badge>
            </div>

            <UpdateOrderStatusButton order={order} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 shrink-0" />
              <FormattedDate date={new Date(order.createdAt)} />
            </span>

            <Separator className="hidden sm:block" orientation="vertical" />

            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-3.5 shrink-0" />
              {order.city}, {order.state}
            </span>

            <Separator className="hidden sm:block" orientation="vertical" />

            <span className="font-medium">
              <Currency currency="COP" value={order.total} />
            </span>
          </div>

          {order.status === 'canceled' && order.cancellationReason && (
            <div className="flex w-full items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
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

        <OrderSummary isAdmin order={order} />
      </div>
    </div>
  )
}
