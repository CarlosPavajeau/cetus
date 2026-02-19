import { api } from '@cetus/api-client'
import { Button } from '@cetus/ui/button'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { SupportButton } from '@cetus/web/components/support-button'
import { useCart } from '@cetus/web/store/cart'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { domAnimation, LazyMotion, m } from 'framer-motion'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
  XIcon,
} from 'lucide-react'
import { useEffect } from 'react'

export const Route = createFileRoute('/orders/$orderId/confirmation')({
  loader: async ({ params }) => {
    try {
      const { orderId } = params
      const order = await api.orders.getById(orderId)

      return { order }
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
      <LazyMotion features={domAnimation}>
        <m.div
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
        </m.div>
      </LazyMotion>
    </DefaultPageLayout>
  ),
})

function OrderConfirmationComponent() {
  const { order } = Route.useLoaderData()

  const { clear } = useCart()
  useEffect(() => {
    clear()
  }, [clear])

  return (
    <DefaultPageLayout>
      <LazyMotion features={domAnimation}>
        <m.div
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
        </m.div>
      </LazyMotion>
    </DefaultPageLayout>
  )
}
