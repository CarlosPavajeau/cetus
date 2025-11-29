import { api } from '@cetus/api-client'
import { env } from '@cetus/env/client'
import {
  orderStatusBadgeVariants,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { PageHeader } from '@cetus/web/components/page-header'
import { ReturnButton } from '@cetus/web/components/return-button'
import { CancelOrderDialog } from '@cetus/web/features/orders/components/cancel-order-dialog'
import { OrderCompletedNotification } from '@cetus/web/features/orders/components/order-completed-notification'
import { OrderCustomerCard } from '@cetus/web/features/orders/components/order-customer.card'
import { OrderItemsList } from '@cetus/web/features/orders/components/order-items-list'
import { PaymentSummary } from '@cetus/web/features/orders/components/payment-summary'
import { orderQueries } from '@cetus/web/features/orders/queries'
import {
  useClientMethod,
  useHub,
  useHubGroup,
} from '@cetus/web/hooks/realtime/use-hub'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AlertCircleIcon,
  CalendarIcon,
  LoaderCircleIcon,
  SendIcon,
} from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

const REALTIME_URL = `${env.VITE_API_URL}/realtime/orders`

export const Route = createFileRoute('/app/orders/$orderId')({
  component: OrderDetailsComponent,
})

type CompleteOrderButtonProps = {
  orderId: string
  onSuccess: () => void
}

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

const CompleteOrderButton = ({
  orderId,
  onSuccess,
}: CompleteOrderButtonProps) => {
  const deliverOrderMutation = useMutation({
    mutationKey: ['orders', 'deliver'],
    mutationFn: () => api.orders.deliver(orderId),
    onSuccess,
  })

  const handleCompleteOrder = useCallback(() => {
    deliverOrderMutation.mutate()
  }, [deliverOrderMutation])

  return (
    <Button
      disabled={deliverOrderMutation.isPending}
      onClick={handleCompleteOrder}
      size="sm"
    >
      {deliverOrderMutation.isPending ? (
        <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
      ) : (
        <SendIcon />
      )}
      {deliverOrderMutation.isPending ? 'Completando...' : 'Completar pedido'}
    </Button>
  )
}

function OrderDetailsComponent() {
  const { orderId } = Route.useParams()
  const navigate = useNavigate()
  const { data: order, isLoading } = useQuery(orderQueries.detail(orderId))

  useRealtimeOrderUpdates(orderId)

  const handleOrderSuccess = useCallback(() => {
    navigate({ to: '/app' })

    if (order) {
      toast.custom((t) => (
        <OrderCompletedNotification
          onClose={() => toast.dismiss(t)}
          orderNumber={order.orderNumber}
        />
      ))
    }
  }, [navigate, order])

  const isCancelable = useMemo(
    () => (order ? order.status !== 'canceled' : false),
    [order],
  )

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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="sticky top-0 z-10 flex w-full flex-col space-y-4 py-4 backdrop-blur-md md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex w-full flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <ReturnButton />
            </div>

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

          <div className="flex flex-wrap items-center gap-2">
            {order.status === 'paid' && (
              <CompleteOrderButton
                onSuccess={handleOrderSuccess}
                orderId={order.id}
              />
            )}

            {isCancelable && <CancelOrderDialog orderId={order.id} />}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-12">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <OrderCustomerCard
                address={order.address}
                customer={order.customer}
              />

              <PaymentSummary order={order} />
            </div>

            <OrderItemsList order={order} />
          </div>
        </div>
      </div>
    </div>
  )
}
