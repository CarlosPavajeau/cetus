import { OrderStatus } from '@/api/orders'
import { ContentLayout } from '@/components/content-layout'
import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderItems } from '@/components/order-items'
import { OrderSummary } from '@/components/order-summary'
import { PageHeader } from '@/components/page-header'
import { useOrder } from '@/hooks/use-order'
import { useTransaction } from '@/hooks/wompi/use-transaction'
import { useCart } from '@/store/cart'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { z } from 'zod'

const orderConfirmationSearchSchema = z.object({
  id: z.string(),
})

export const Route = createFileRoute('/orders/$orderId/confirmation')({
  component: OrderConfirmatioComponent,
  validateSearch: orderConfirmationSearchSchema,
})

function OrderConfirmatioComponent() {
  const { orderId } = Route.useParams()
  const { id } = Route.useSearch()

  const { order, isLoading } = useOrder(orderId)
  const { transaction, isLoading: isLoadingTransaction } = useTransaction(id)

  const { clear } = useCart()
  useEffect(() => {
    if (!transaction || !order) return

    if (transaction.data.status === 'APPROVED') {
      clear()
    }
  }, [clear, transaction, order])

  if (isLoading || isLoadingTransaction) {
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

  if (!transaction) {
    return (
      <DefaultPageLayout showHeader={false}>
        <PageHeader
          title="Transacción no encontrada"
          subtitle={
            <>
              No se pudo encontrar la transacción de pago asociada a este
              pedido. Por favor, ponte en contacto con nosotros para resolver
              este problema. El código de transacción es{' '}
              <span className="font-medium">{id}</span> y el código de pedido es
              #<span className="font-medium">{order.orderNumber}</span>.
            </>
          }
        />
      </DefaultPageLayout>
    )
  }

  if (transaction.data.status === 'DECLINED') {
    return (
      <DefaultPageLayout showHeader={false}>
        <PageHeader
          title="Tu pago ha sido rechazado"
          subtitle={
            <>
              El pago de tu pedido ha sido rechazado. Por favor, ponte en
              contacto con nosotros para resolver este problema. El código de
              transacción es <span className="font-medium">{id}</span> y el
              código de pedido es #
              <span className="font-medium">{order.orderNumber}</span>.
            </>
          }
        />
      </DefaultPageLayout>
    )
  }

  if (transaction.data.status === 'ERROR') {
    return (
      <DefaultPageLayout showHeader={false}>
        <PageHeader
          title="Ha ocurrido un error con tu pago"
          subtitle={
            <>
              Ha ocurrido un error con tu pago. Por favor, ponte en contacto con
              nosotros para resolver este problema. El código de transacción es{' '}
              <span className="font-medium">{id}</span> y el código de pedido es
              #<span className="font-medium">{order.orderNumber}</span>.
            </>
          }
        />
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout showHeader={false}>
      <PageHeader
        title={`Pedido #${order.orderNumber} confirmado`}
        subtitle={
          <>
            <span className="font-medium">{order.customer.name}</span> tu pedido
            ha sido confirmado. Recueda que debes cancelar el costo del envío al
            recibir tu pedido. Si tienes alguna duda, por favor, ponte en
            contacto con nosotros. El código de transacción es{' '}
            <span className="font-medium">{id}</span> y el código de pedido es #
            <span className="font-medium">{order.orderNumber}</span>.
            <hr className="my-4 border-0" />
            <span>
              Tu pago puede estar pendiente de confirmación. Por favor, espera
              unos minutos y revisa tu correo electrónico para confirmar que tu
              pago ha sido procesado correctamente.
            </span>
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
