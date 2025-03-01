import {
  OrderStatus,
  OrderStatusColor,
  OrderStatusText,
  updateOrder,
} from '@/api/orders'
import { Currency } from '@/components/currency'
import { FormattedDate } from '@/components/formatted-date'
import { Image } from '@/components/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOrder } from '@/hooks/use-order'
import { getImageUrl } from '@/shared/cdn'
import { cn } from '@/shared/cn'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect } from 'react'

export const Route = createFileRoute('/app/orders/$orderId')({
  component: RouteComponent,
})

function RouteComponent() {
  const params = Route.useParams()
  const orderId = params.orderId

  const { order, isLoading } = useOrder(orderId)

  const updateOrderMutation = useMutation({
    mutationKey: ['orders', 'update'],
    mutationFn: () =>
      updateOrder({ id: orderId, status: OrderStatus.Delivered }),
  })

  const handleCompleteOrder = () => {
    updateOrderMutation.mutate()
  }

  const navigate = useNavigate()
  useEffect(() => {
    if (updateOrderMutation.isSuccess) {
      navigate({
        to: '/app',
      })
    }
  }, [updateOrderMutation.isSuccess, navigate])

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
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border bg-card p-4 text-card-foreground"
                  >
                    <div className="flex gap-4">
                      <div className="relative h-24 w-24">
                        <Image
                          src={getImageUrl(item.imageUrl || 'placeholder.svg')}
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

              <div>
                <div className="space-y-6">
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

                  {order.status === OrderStatus.Paid && (
                    <Button
                      type="submit"
                      className="group w-full"
                      size="lg"
                      onClick={handleCompleteOrder}
                      disabled={
                        order.status !== OrderStatus.Paid ||
                        updateOrderMutation.isPending
                      }
                    >
                      {updateOrderMutation.isPending && (
                        <LoaderCircleIcon
                          className="animate-spin"
                          size={16}
                          aria-hidden="true"
                        />
                      )}
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
