import { OrderStatus, deliverOrder } from '@/api/orders'
import { AccessDenied } from '@/components/access-denied'
import { ContentLayout } from '@/components/content-layout'
import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderCompletedNotification } from '@/components/order-completed-notification'
import { OrderItems } from '@/components/order-items'
import { OrderSummary } from '@/components/order-summary'
import { PageHeader } from '@/components/page-header'
import { TransactionSummary } from '@/components/transaction-summary'
import { Button } from '@/components/ui/button'
import { useClientMethod, useHub, useHubGroup } from '@/hooks/realtime/use-hub'
import { useOrder } from '@/hooks/use-order'
import { Protect } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
import { useCallback } from 'react'
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

const PendingPaymentStatus = () => (
  <div className="rounded-lg border bg-background p-4">
    <h2 className="font-medium text-lg">Pago pendiente por confirmar</h2>
    <p className="text-muted-foreground text-sm">
      El pago de este pedido aún no ha sido confirmado.
    </p>
  </div>
)

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

  if (isLoading) {
    return (
      <DefaultPageLayout showHeader={false}>
        <DefaultLoader />
      </DefaultPageLayout>
    )
  }

  if (!order) {
    return (
      <DefaultPageLayout showHeader={false}>
        <PageHeader
          title="Pedido no encontrado"
          subtitle="No se pudo encontrar el pedido solicitado."
        />
      </DefaultPageLayout>
    )
  }

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <DefaultPageLayout showHeader={false}>
        <PageHeader title={`Procesamiento del pedido #${order.orderNumber}`} />

        <ContentLayout>
          <OrderItems items={order.items} />

          <div>
            <div className="space-y-6">
              <OrderSummary order={order} showStatus={true} />

              {order.transactionId && (
                <TransactionSummary id={order.transactionId} />
              )}

              {order.status === OrderStatus.Pending && <PendingPaymentStatus />}

              {order.status === OrderStatus.Paid && (
                <CompleteOrderButton
                  orderId={orderId}
                  onSuccess={handleOrderSuccess}
                />
              )}
            </div>
          </div>
        </ContentLayout>
      </DefaultPageLayout>
    </Protect>
  )
}
