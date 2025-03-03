import { OrderStatus } from '@/api/orders'
import { ContentLayout } from '@/components/content-layout'
import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderItems } from '@/components/order-items'
import { OrderSummary } from '@/components/order-summary'
import { PageHeader } from '@/components/page-header'
import { useOrder } from '@/hooks/use-order'
import { useCart } from '@/store/cart'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/orders/$orderId/confirmation')({
  component: RouteComponent,
})

function RouteComponent() {
  const params = Route.useParams()
  const orderId = params.orderId

  const { order, isLoading } = useOrder(orderId)
  const { clear } = useCart()

  useEffect(() => {
    clear()
  }, [clear])

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
    <DefaultPageLayout showHeader={false}>
      <PageHeader
        title="¡Gracias por tu compra!"
        subtitle={
          <>
            <span className="font-medium">{order.customer.name}</span> tu pedido
            ha sido confirmado. En breve recibirás un correo con los detalles de
            tu compra.
          </>
        }
      />

      <ContentLayout>
        <OrderItems items={order.items} title="Productos en tu pedido" />

        <div>
          <div className="space-y-6">
            <OrderSummary order={order} showStatus />

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
          </div>
        </div>
      </ContentLayout>
    </DefaultPageLayout>
  )
}
