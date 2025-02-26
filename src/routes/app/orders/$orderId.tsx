import { OrderStatus, OrderStatusColor, OrderStatusText } from '@/api/orders'
import { Currency } from '@/components/currency'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOrder } from '@/hooks/use-order'
import { cn } from '@/shared/cn'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'

export const Route = createFileRoute('/app/orders/$orderId')({
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
          <div className="max-w-3xl max-sm:text-center">
            <h1 className="mb-4 font-bold font-heading text-4xl/[1.1] text-foreground tracking-tight md:text-5xl/[1.1]">
              Procesamiento del pedido
            </h1>

            <p className="text-muted-foreground">
              Pedido #{order.id} de{' '}
              <span className="font-medium">{order.customer.name}</span>.
            </p>
          </div>

          <div className="relative my-16">
            <div className="grid grid-cols-1 gap-y-6 md:grid-cols-2">
              <div>
                <div className="grid gap-4 md:border-border md:border-r md:pr-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-border bg-white p-4"
                    >
                      <div className="flex h-full flex-col justify-between *:not-first:mt-4">
                        <h2 className="font-medium text-base leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {item.productName}
                        </h2>

                        <div className="mt-4 flex items-center justify-between">
                          <p className="font-bold text-base text-foreground">
                            <Currency value={item.price} currency="COP" /> x{' '}
                            {item.quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between space-y-8 md:pl-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-medium text-lg">Resumen del pedido</h2>

                    <Badge variant="outline">
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          OrderStatusColor[order.status],
                        )}
                        aria-hidden="true"
                      ></span>
                      {OrderStatusText[order.status]}
                    </Badge>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span>
                      <span className="font-medium">{order.customer.name}</span>
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dirección</span>
                    <span>
                      <span className="font-medium">{order.address}</span>
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono</span>
                    <span>
                      <span className="font-medium">
                        {order.customer.phone}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Fecha
                      </span>
                      <span>
                        <span className="text-sm">
                          <FormattedDate date={new Date(order.createdAt)} />
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <h2 className="font-medium text-muted-foreground">
                        Total
                      </h2>
                      <h2 className="font-bold text-foreground">
                        <Currency value={order.total} currency="COP" />
                      </h2>
                    </div>
                  </div>

                  {order.status === OrderStatus.Pending && (
                    <div className="my-4 rounded-lg border bg-background p-4">
                      <h2 className="font-medium">
                        Pago pendiente por confirmar
                      </h2>

                      <p className="text-muted-foreground text-sm">
                        El pago de este pedido aún no ha sido confirmado.
                      </p>
                    </div>
                  )}

                  {order.status === OrderStatus.Paid && (
                    <Button
                      type="submit"
                      className="group w-full"
                      disabled={order.status !== OrderStatus.Paid}
                    >
                      Completar pedido
                      <ArrowRightIcon
                        className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
                        size={16}
                        aria-hidden="true"
                      />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
