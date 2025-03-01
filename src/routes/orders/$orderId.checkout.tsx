import { Currency } from '@/components/currency'
import { FormattedDate } from '@/components/formatted-date'
import { Image } from '@/components/image'
import { WonpiPaymentButton } from '@/components/wompi-payment-button'
import { useOrder } from '@/hooks/use-order'
import { getImageUrl } from '@/shared/cdn'
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
        <div data-home="true">
          <div className="max-w-3xl max-sm:text-center">
            <h1 className="mb-4 font-bold font-heading text-4xl/[1.1] text-foreground tracking-tight md:text-5xl/[1.1]">
              Ya casi estás listo
            </h1>

            <p className="text-muted-foreground">
              <span className="font-medium">{order.customer.name}</span> estás a
              punto de realizar tu pedido. Por favor, revisa los detalles de tu
              compra y completa el proceso de pago.
            </p>
          </div>

          <div className="relative my-16">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <h2 className="font-medium text-lg">Productos en tu pedido</h2>

                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-card p-4 text-card-foreground"
                    >
                      <div className="flex gap-4">
                        <div className="relative h-24 w-24">
                          <Image
                            src={getImageUrl(
                              item.imageUrl || 'placeholder.svg',
                            )}
                            alt={item.productName}
                            layout="fill"
                            className="rounded-md object-cover"
                          />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between">
                            <h3 className="font-medium">{item.productName}</h3>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Currency value={item.price} currency="COP" /> x{' '}
                              {item.quantity}
                            </div>
                            <div className="ml-auto font-medium">
                              <Currency
                                value={item.price * item.quantity}
                                currency="COP"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between space-y-8 md:pl-4">
                <div className="space-y-6">
                  <h2 className="font-medium text-lg">Resumen de tu pedido</h2>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cliente</span>
                      <span>{order.customer.name}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dirección</span>
                      <span className="font-medium">{order.address}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Teléfono</span>
                      <span className="font-medium">
                        {order.customer.phone}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground text-sm">
                        Fecha
                      </span>
                      <span>
                        <FormattedDate date={new Date(order.createdAt)} />
                      </span>
                    </div>

                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>
                        <Currency value={order.total} currency="COP" />
                      </span>
                    </div>

                    <WonpiPaymentButton order={order} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
