import { OrderStatus, updateOrder } from '@/api/orders'
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
import { useEffect } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/orders/$orderId')({
  component: OrderDetailsComponent,
})

function OrderDetailsComponent() {
  const params = Route.useParams()
  const orderId = params.orderId

  const { order, isLoading } = useOrder(orderId)

  const url = `${import.meta.env.PUBLIC_API_URL}/realtime/orders`
  const { connection } = useHub(url)

  useHubGroup(connection, 'JoinOrderGroup', orderId)

  const queryClient = useQueryClient()
  useClientMethod(connection, 'ReceiveUpdatedOrder', () => {
    queryClient.invalidateQueries({
      queryKey: ['orders', orderId],
    })
  })

  const updateOrderMutation = useMutation({
    mutationKey: ['orders', 'update'],
    mutationFn: () =>
      updateOrder({
        id: orderId,
        status: OrderStatus.Delivered,
      }),
  })

  const handleCompleteOrder = () => {
    updateOrderMutation.mutate()
  }

  const navigate = useNavigate()
  useEffect(() => {
    if (updateOrderMutation.isSuccess) {
      navigate({
        to: '/app',
      })

      if (order) {
        toast.custom((t) => (
          <OrderCompletedNotification
            orderNumber={order.orderNumber}
            onClose={() => toast.dismiss(t)}
          />
        ))
      }
    }
  }, [updateOrderMutation.isSuccess, navigate, order])

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

              {order.status === OrderStatus.Pending && (
                <div className="rounded-lg border bg-background p-4">
                  <h2 className="font-medium text-lg">
                    Pago pendiente por confirmar
                  </h2>

                  <p className="text-muted-foreground text-sm">
                    El pago de este pedido aún no ha sido confirmado.
                  </p>
                </div>
              )}

              {order.status === OrderStatus.Paid && (
                <Button
                  type="submit"
                  className="group w-full"
                  size="lg"
                  onClick={handleCompleteOrder}
                  disabled={
                    order.status !== OrderStatus.Paid ||
                    updateOrderMutation.isPending
                  }
                >
                  {updateOrderMutation.isPending && (
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
              )}
            </div>
          </div>
        </ContentLayout>
      </DefaultPageLayout>
    </Protect>
  )
}
