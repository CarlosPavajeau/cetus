import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { SupportButton } from '@/components/support-button'
import { Button } from '@/components/ui/button'
import { useOrder } from '@/hooks/orders'
import { useTransaction } from '@/hooks/wompi/use-transaction'
import { useCart } from '@/store/cart'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CheckCircleIcon, ShoppingBagIcon, XIcon } from 'lucide-react'
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
      <DefaultPageLayout>
        <DefaultLoader />
      </DefaultPageLayout>
    )
  }

  if (!order) {
    return (
      <DefaultPageLayout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          <div className="mb-4 rounded-full bg-red-100 p-6">
            <XIcon size={32} className="text-red-600" />
          </div>
          <h2 className="mb-2 font-semibold text-xl">¡Pedido no encontrado!</h2>
          <p className="mb-2 text-muted-foreground">
            Tu número de pedido es #
            <span className="font-medium">{orderId}</span>.
          </p>

          <p className="mb-6 max-w-md text-muted-foreground">
            No se pudo encontrar el pedido asociado a tu número. Por favor,
            contacta al soporte para más ayuda.
          </p>

          <div className="w-full max-w-xs space-y-3">
            <SupportButton
              message={`Hola, he tenido un problema con mi pedido. El número de mi pedido es ${orderId}`}
            />
          </div>
        </motion.div>
      </DefaultPageLayout>
    )
  }

  if (!transaction) {
    return (
      <DefaultPageLayout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          <div className="mb-4 rounded-full bg-red-100 p-6">
            <XIcon size={32} className="text-red-600" />
          </div>
          <h2 className="mb-2 font-semibold text-xl">
            ¡Transaccion no encontrada!
          </h2>
          <p className="mb-2 text-muted-foreground">
            Tu número de pedido es #
            <span className="font-medium">{order.orderNumber}</span>.
          </p>

          <p className="mb-6 max-w-md text-muted-foreground">
            No se pudo encontrar la transacción asociada a tu pedido. Por favor,
            contacta al soporte para más ayuda.
          </p>

          <div className="w-full max-w-xs space-y-3">
            <SupportButton
              message={`Hola, he tenido un problema con el pago de mi pedido. El número de mi pedido es ${order.orderNumber}`}
            />

            <Button asChild variant="outline" className="w-full">
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

  if (transaction.data.status === 'DECLINED') {
    return (
      <DefaultPageLayout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          <div className="mb-4 rounded-full bg-red-100 p-6">
            <XIcon size={32} className="text-red-600" />
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

            <Button asChild variant="outline" className="w-full">
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-8 text-center"
      >
        <div className="mb-4 rounded-full bg-emerald-100 p-6">
          <CheckCircleIcon size={32} className="text-emerald-600" />
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
          <Button className="w-full" disabled>
            Ver pedido
          </Button>

          <Button asChild variant="outline" className="w-full">
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
