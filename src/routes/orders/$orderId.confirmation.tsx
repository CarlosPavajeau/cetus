import { fetchOrder } from '@/api/orders'
import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { SupportButton } from '@/components/support-button'
import { Button } from '@/components/ui/button'
import { GetPayment } from '@/server/mercadopago'
import { useCart } from '@/store/cart'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { type } from 'arktype'
import { motion } from 'framer-motion'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  InfoIcon,
  ShoppingBagIcon,
  XIcon,
} from 'lucide-react'
import { useEffect } from 'react'

const OrderConfirmationSearchSchema = type({
  payment_id: 'number.integer',
})

export const Route = createFileRoute('/orders/$orderId/confirmation')({
  validateSearch: OrderConfirmationSearchSchema,
  beforeLoad: ({ search }) => {
    const { payment_id } = search
    return {
      payment_id,
    }
  },
  loader: async ({ params, context }) => {
    try {
      const { orderId } = params
      const order = await fetchOrder(orderId)

      const { payment_id } = context
      const payment = await GetPayment({
        data: {
          payment_id,
        },
      })

      return { order, payment }
    } catch (err) {
      throw notFound()
    }
  },
  pendingComponent: () => (
    <DefaultPageLayout>
      <DefaultLoader />
    </DefaultPageLayout>
  ),
  component: OrderConfirmationComponent,
  notFoundComponent: () => (
    <DefaultPageLayout>
      <motion.div
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-8 text-center"
        initial={{ opacity: 0 }}
      >
        <div className="mb-4 rounded-full bg-red-100 p-6">
          <XIcon className="text-red-600" size={32} />
        </div>
        <h2 className="mb-2 font-semibold text-xl">¡Pedido no encontrado!</h2>

        <p className="mb-6 max-w-md text-muted-foreground">
          No se pudo encontrar el pedido asociado a tu número. Por favor,
          contacta al soporte para más ayuda.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <SupportButton
            message={'Hola, he tenido un problema con mi pedido.'}
          />
        </div>
      </motion.div>
    </DefaultPageLayout>
  ),
})

function OrderConfirmationComponent() {
  const { order, payment } = Route.useLoaderData()

  const { clear } = useCart()
  useEffect(() => {
    clear()
  }, [clear])

  if (payment.status === 'rejected') {
    return (
      <DefaultPageLayout>
        <motion.div
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-8 text-center"
          initial={{ opacity: 0 }}
        >
          <div className="mb-4 rounded-full bg-red-100 p-6">
            <XIcon className="text-red-600" size={32} />
          </div>
          <h2 className="mb-2 font-semibold text-xl">
            ¡Tu pago ha sido rechazado!
          </h2>
          <p className="mb-2 text-muted-foreground">
            Tu número de pedido es #
            <span className="font-medium">{order.orderNumber}</span>.
          </p>

          <p className="mb-6 max-w-md text-muted-foreground">
            Tu pago ha sido rechazado. Por favor, revisa los detalles de tu
            tarjeta o método de pago y vuelve a intentarlo. Si el problema
            persiste, ponte en contacto con nosotros para resolverlo.
          </p>

          <div className="w-full max-w-xs space-y-3">
            <SupportButton
              message={`Hola, he tenido un problema con el pago de mi pedido. El número de mi pedido es ${order.orderNumber}`}
            />

            <Button asChild className="w-full" variant="outline">
              <Link to="/">
                <ShoppingBagIcon className="mr-2" />
                Volver a la tienda
              </Link>
            </Button>
          </div>
        </motion.div>
      </DefaultPageLayout>
    )
  }

  if (payment.status !== 'approved') {
    return (
      <DefaultPageLayout>
        <motion.div
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-8 text-center"
          initial={{ opacity: 0 }}
        >
          <div className="mb-4 rounded-full bg-primary/10 p-6">
            <InfoIcon className="text-primary" size={32} />
          </div>
          <h2 className="mb-2 font-semibold text-xl">
            ¡Estamos procesando tu pago!
          </h2>
          <p className="mb-2 text-muted-foreground">
            Tu número de pedido es #
            <span className="font-medium">{order.orderNumber}</span>.
          </p>

          <p className="mb-6 max-w-md text-muted-foreground">
            Estamos en proceso de verificación de tu pago. Esto puede tardar
            unos minutos. Te notificaremos tan pronto como se complete el
            proceso.
          </p>

          <div className="w-full max-w-xs space-y-3">
            <SupportButton
              message={`Hola, quisiera saber el estado de mi pedido. El número de mi pedido es ${order.orderNumber}`}
            />

            <Button asChild className="w-full" variant="outline">
              <Link to="/">
                <ShoppingBagIcon className="mr-2" />
                Volver a la tienda
              </Link>
            </Button>
          </div>
        </motion.div>
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <motion.div
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-8 text-center"
        initial={{ opacity: 0 }}
      >
        <div className="mb-4 rounded-full bg-emerald-100 p-6">
          <CheckCircleIcon className="text-emerald-600" size={32} />
        </div>
        <h2 className="mb-2 font-semibold text-xl">¡Pedido completado!</h2>
        <p className="mb-2 text-muted-foreground">
          Tu número de pedido es #
          <span className="font-medium">{order.orderNumber}</span>.
        </p>

        <p className="mb-6 max-w-md text-muted-foreground">
          Enviaremos un correo electrónico con los detalles de tu compra.
          Gracias por tu preferencia.
        </p>

        <p className="mb-6 max-w-md text-muted-foreground">
          Recuerda que debes cancelar el costo del envío al momento de recibir
          tu pedido.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <Button asChild className="group w-full">
            <Link params={{ id: order.id }} to="/orders/$id">
              Ver detalles del pedido
              <ArrowRightIcon
                aria-hidden="true"
                className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
                size={16}
              />
            </Link>
          </Button>

          <Button asChild className="w-full" variant="outline">
            <Link to="/">
              <ShoppingBagIcon className="mr-2" />
              Seguir comprando
            </Link>
          </Button>
        </div>

        <small className="mt-4 text-muted-foreground text-xs">
          Recuerda que tu pago puede tardar unos minutos en reflejarse
          correctamente. Si tienes alguna duda, no dudes en contactarnos.
        </small>

        <div className="mt-6 w-full max-w-xs">
          <SupportButton
            message={`Hola, me gustaría saber más sobre mi pedido #${order.orderNumber}`}
          />
        </div>
      </motion.div>
    </DefaultPageLayout>
  )
}
