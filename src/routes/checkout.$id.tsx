import { createOrderPayment, fetchOrder } from '@/api/orders'
import { RedeemCoupon } from '@/components/coupons/redeem-coupon'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderSummary } from '@/components/order/order-summary'
import { PageHeader } from '@/components/page-header'
import { SubmitButton } from '@/components/submit-button'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'

export const Route = createFileRoute('/checkout/$id')({
  loader: async ({ params }) => {
    const { id } = params
    const order = await fetchOrder(id)

    if (!order) {
      throw notFound()
    }

    return { order }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { order } = Route.useLoaderData()

  const { mutate, isPending } = useMutation({
    mutationKey: ['orders', 'payment', 'create'],
    mutationFn: createOrderPayment,
    onSuccess: (paymentUrl) => {
      window.location.href = paymentUrl
    },
  })

  const handlePayment = () => {
    mutate(order.id)
  }

  return (
    <DefaultPageLayout>
      <PageHeader
        title={`Pedido #${order.orderNumber}`}
        subtitle="Tu pedido ha sido creado exitosamente. Ahora, puedes proceder al pago."
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <RedeemCoupon order={order} />
          </div>

          <div className="hidden flex-col gap-2 md:flex">
            <OrderSummary order={order} />
          </div>
        </div>

        <SubmitButton
          size="lg"
          className="w-full"
          disabled={isPending}
          isSubmitting={isPending}
          onClick={handlePayment}
        >
          Ir a pagar
        </SubmitButton>

        <div>
          <small className="text-muted-foreground text-xs">
            Seras redirigido al portal de pagos de MercadoPago para completar el
            pago de tu pedido.
          </small>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
