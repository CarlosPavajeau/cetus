import { useOrder } from '@/hooks/use-order'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/orders/$orderId/checkout')({
  component: RouteComponent,
})

function RouteComponent() {
  const params = Route.useParams()
  const orderId = params.orderId

  const { order, isLoading } = useOrder(orderId)

  return (
    <main className="grow">
      {isLoading && (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <span>Cargando...</span>
        </div>
      )}
      {order && (
        <div>
          <div data-home="true">
            <div className="max-w-3xl max-sm:text-center">
              <h1 className="mb-4 font-bold font-heading text-4xl/[1.1] text-foreground tracking-tight md:text-5xl/[1.1]">
                Ya casi estás listo
              </h1>

              <p className="text-muted-foreground">
                <span className="font-medium">{order.customer.name}</span> estás
                a punto de realizar tu pedido. Por favor, revisa los detalles de
                tu compra y completa el proceso de pago.
              </p>
            </div>
          </div>

          <div className="my-4 rounded-lg border bg-background p-4">
            <h2 className="font-medium text-lg">En construcción</h2>
            <p className="text-muted-foreground">
              Actualmente estamos trabajando en la integración de pagos para que
              puedas realizar tus pedidos de forma segura y rápida.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
