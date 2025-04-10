import type { Order } from '@/api/orders'
import { ContentLayout } from '@/components/content-layout'
import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderItems } from '@/components/order-items'
import { OrderSummary } from '@/components/order-summary'
import { PageHeader } from '@/components/page-header'
import { PaymentOptions } from '@/components/payment/payment-options'
import { useOrder } from '@/hooks/orders'
import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { memo } from 'react'

export const Route = createFileRoute('/orders/$orderId/checkout')({
  component: CheckoutComponent,
})

const CheckoutErrorFallback = memo(({ error }: { error: Error }) => (
  <DefaultPageLayout>
    <PageHeader
      title="Error"
      subtitle={`Lo sentimos, ha ocurrido un error: ${error.message || 'Error desconocido'}`}
    />
  </DefaultPageLayout>
))
CheckoutErrorFallback.displayName = 'CheckoutErrorFallback'

const LoadingState = memo(() => (
  <DefaultPageLayout>
    <DefaultLoader />
  </DefaultPageLayout>
))
LoadingState.displayName = 'LoadingState'

const OrderNotFound = memo(() => (
  <DefaultPageLayout>
    <PageHeader
      title="Pedido no encontrado"
      subtitle="No se pudo encontrar el pedido solicitado."
    />
  </DefaultPageLayout>
))
OrderNotFound.displayName = 'OrderNotFound'

const CheckoutContent = memo(({ order }: { order: Order }) => (
  <DefaultPageLayout>
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

    <AnimatePresence mode="wait">
      <motion.div
        className="mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <ContentLayout>
          <div className="space-y-6">
            <OrderItems items={order.items} title="Productos en tu pedido" />

            <OrderSummary order={order} />
          </div>

          <div className="space-y-6">
            <h2 className="font-medium text-lg">Método de pago</h2>
            <PaymentOptions order={order} />
          </div>
        </ContentLayout>
      </motion.div>
    </AnimatePresence>
  </DefaultPageLayout>
))
CheckoutContent.displayName = 'CheckoutContent'

function CheckoutComponent() {
  const { orderId } = Route.useParams()

  const { order, isLoading, error } = useOrder(orderId)

  if (error) {
    return (
      <CheckoutErrorFallback
        error={error instanceof Error ? error : new Error('Error desconocido')}
      />
    )
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (!order) {
    return <OrderNotFound />
  }

  return <CheckoutContent order={order} />
}
