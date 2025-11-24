import { api } from '@cetus/api-client'
import { env } from '@cetus/env/client'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { PageHeader } from '@cetus/web/components/page-header'
import { ReturnButton } from '@cetus/web/components/return-button'
import { CancelOrderDialog } from '@cetus/web/features/orders/components/cancel-order-dialog'
import { OrderCompletedNotification } from '@cetus/web/features/orders/components/order-completed-notification'
import { OrderSummary } from '@cetus/web/features/orders/components/order-summary'
import { orderQueries } from '@cetus/web/features/orders/queries'
import {
  useClientMethod,
  useHub,
  useHubGroup,
} from '@cetus/web/hooks/realtime/use-hub'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
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
      className="group w-full"
      disabled={deliverOrderMutation.isPending}
      onClick={handleCompleteOrder}
      size="lg"
      type="submit"
    >
      {deliverOrderMutation.isPending && (
        <LoaderCircleIcon
          aria-hidden="true"
          className="animate-spin"
          size={16}
        />
      )}
      Completar pedido
      <ArrowRightIcon
        aria-hidden="true"
        className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
        size={16}
      />
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
    <div className="p-4">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center justify-between space-y-2">
          <ReturnButton />
        </div>

        <Badge className="ml-auto" variant="secondary">
          #{order.orderNumber}
        </Badge>
      </div>

      <div>
        <OrderSummary order={order} />

        <div className="mt-6 flex w-full flex-col gap-2">
          {order.status === 'paid' && (
            <CompleteOrderButton
              onSuccess={handleOrderSuccess}
              orderId={order.id}
            />
          )}

          {isCancelable && <CancelOrderDialog orderId={order.id} />}
        </div>
      </div>
    </div>
  )
}
