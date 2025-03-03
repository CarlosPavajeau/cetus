import { ContentLayout } from '@/components/content-layout'
import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderItems } from '@/components/order-items'
import { OrderSummary } from '@/components/order-summary'
import { PageHeader } from '@/components/page-header'
import { PaymentOptions } from '@/components/payment-options'
import { useOrder } from '@/hooks/use-order'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/orders/$orderId/checkout')({
  component: CheckoutComponent,
})

function CheckoutComponent() {
  const params = Route.useParams()
  const orderId = params.orderId

  const { order, isLoading } = useOrder(orderId)

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
        title="Ya casi estás listo"
        subtitle={
          <>
            <span className="font-medium">{order.customer.name}</span> estás a
            punto de realizar tu pedido. Por favor, revisa los detalles de tu
            compra y completa el proceso de pago.
          </>
        }
      />

      <ContentLayout>
        <OrderItems items={order.items} title="Productos en tu pedido" />

        <div className="flex flex-col justify-between space-y-8 md:pl-4">
          <div className="space-y-6">
            <OrderSummary order={order} />

            <h2 className="font-medium text-lg">Método de pago</h2>
            <PaymentOptions order={order} />
          </div>
        </div>
      </ContentLayout>
    </DefaultPageLayout>
  )
}
