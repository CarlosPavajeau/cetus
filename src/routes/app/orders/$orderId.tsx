import { OrderStatus, deliverOrder } from '@/api/orders'
import { AccessDenied } from '@/components/access-denied'
import { DefaultLoader } from '@/components/default-loader'
import { CancelOrderButton } from '@/components/order/cancel-order-button'
import { OrderCompletedNotification } from '@/components/order/order-completed-notification'
import { OrderSummary } from '@/components/order/order-summary'
import { TransactionSummary } from '@/components/order/transaction-summary'
import { PageHeader } from '@/components/page-header'
import { ReturnButton } from '@/components/return-button'
import { Button } from '@/components/ui/button'
import { useOrder } from '@/hooks/orders'
import { useClientMethod, useHub, useHubGroup } from '@/hooks/realtime/use-hub'
import { Protect } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

const REALTIME_URL = `${import.meta.env.PUBLIC_API_URL}/realtime/orders`

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
    mutationFn: () => deliverOrder(orderId),
    onSuccess,
  })

  const handleCompleteOrder = useCallback(() => {
    deliverOrderMutation.mutate()
  }, [deliverOrderMutation])

  return (
    <Button
      type="submit"
      className="group w-full"
      size="lg"
      onClick={handleCompleteOrder}
      disabled={deliverOrderMutation.isPending}
    >
      {deliverOrderMutation.isPending && (
        <LoaderCircleIcon
          className="animate-spin"
          size={16}
          aria-hidden="true"
        />
      )}
      Completar pedido
      <ArrowRightIcon
        className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
        size={16}
        aria-hidden="true"
      />
    </Button>
  )
}

function OrderDetailsComponent() {
  const { orderId } = Route.useParams()
  const navigate = useNavigate()
  const { order, isLoading } = useOrder(orderId)

  useRealtimeOrderUpdates(orderId)

  const handleOrderSuccess = useCallback(() => {
    navigate({ to: '/app' })

    if (order) {
      toast.custom((t) => (
        <OrderCompletedNotification
          orderNumber={order.orderNumber}
          onClose={() => toast.dismiss(t)}
        />
      ))
    }
  }, [navigate, order])

  const isCancelable = useMemo(() => {
    if (!order) return false

    if (order.status === OrderStatus.Pending) return true

    return false
  }, [order])

  if (isLoading) {
    return <DefaultLoader />
  }

  if (!order) {
    return (
      <PageHeader
        title="Pedido no encontrado"
        subtitle="No se pudo encontrar el pedido solicitado."
      />
    )
  }

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="space-y-6">
        <div className="space-y-2">
          <ReturnButton />
          <h2 className="font-medium">
            Procesamiento del pedido #{order.orderNumber}
          </h2>
        </div>

        <OrderSummary order={order} showId />

        {order.transactionId && <TransactionSummary id={order.transactionId} />}

        <div className="space-y-3">
          {order.status === OrderStatus.Paid && (
            <CompleteOrderButton
              orderId={order.id}
              onSuccess={handleOrderSuccess}
            />
          )}

          {isCancelable && <CancelOrderButton orderId={order.id} />}
        </div>
      </div>
    </Protect>
  )
}
