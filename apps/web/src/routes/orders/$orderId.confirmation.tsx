import { api } from '@cetus/api-client'
import { orderStatusLabels } from '@cetus/shared/constants/order'
import { getImageUrl } from '@cetus/shared/utils/image'
import { Currency } from '@cetus/web/components/currency'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { FrontStoreHeader } from '@cetus/web/components/front-store/front-store-header'
import { SupportButton } from '@cetus/web/components/support-button'
import { useCart } from '@cetus/web/store/cart'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { Image } from '@unpic/react'
import { CheckCircle2, ShoppingBag } from 'lucide-react'
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
  pendingComponent: () => <DefaultLoader />,
  component: OrderConfirmationComponent,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-10 flex flex-col items-center gap-5 text-center">
            <div className="flex size-20 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10">
              <CheckCircle2 className="size-10 text-red-500" />
            </div>
            <div>
              <p className="mb-1 font-mono text-muted-foreground text-xs uppercase tracking-widest">
                ¡Pedido no encontrado!
              </p>
              <h1 className="font-bold text-3xl tracking-tight">
                No se pudo encontrar el pedido asociado a tu número. Por favor,
                contacta al soporte para más ayuda.
              </h1>
              <p className="mt-3 max-w-sm text-muted-foreground text-sm leading-relaxed">
                Enviaremos un correo electrónico con los detalles de tu compra.
              </p>
            </div>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <SupportButton
              message={'Hola, he tenido un problema con mi pedido.'}
            />
          </div>
        </div>
      </div>
    </div>
  ),
})

function OrderConfirmationComponent() {
  const { order } = Route.useLoaderData()
  const { store } = useTenantStore()

  const { clear } = useCart()
  useEffect(() => {
    clear()
  }, [clear])

  if (!store) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FrontStoreHeader
        hasCustomDomain={Boolean(store.customDomain)}
        store={store}
      />

      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-10 flex flex-col items-center gap-5 text-center">
            <div className="flex size-20 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="size-10 text-emerald-500" />
            </div>
            <div>
              <p className="mb-1 font-mono text-muted-foreground text-xs uppercase tracking-widest">
                Pedido confirmado
              </p>
              <h1 className="font-bold text-3xl tracking-tight">
                #{order.orderNumber}
              </h1>
              <p className="mt-3 max-w-sm text-muted-foreground text-sm leading-relaxed">
                Enviaremos un correo electrónico con los detalles de tu compra.
              </p>
            </div>
          </div>

          <section aria-label="Order status" className="mb-10">
            <p className="mb-4 font-mono text-muted-foreground text-xs uppercase tracking-widest">
              Estado de la orden
            </p>
            <div className="rounded-md border border-border bg-card p-6">
              {orderStatusLabels[order.status]}
            </div>
          </section>

          <section aria-label="Items ordered" className="mb-10">
            <p className="mb-4 font-mono text-muted-foreground text-xs uppercase tracking-widest">
              Productos
            </p>
            <div className="flex flex-col gap-2">
              {order.items.map((item) => {
                return (
                  <div
                    className="flex items-center gap-4 rounded-md border border-border bg-card p-4"
                    key={item.id}
                  >
                    <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md to-transparent">
                      <Image
                        alt={item.productName}
                        className="object-cover"
                        layout="fullWidth"
                        src={getImageUrl(item.imageUrl ?? 'placeholder.svg')}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {item.productName}
                      </p>
                      <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
                        {item.optionValues.length > 0
                          ? item.optionValues
                              .map((v) => `${v.optionTypeName}: ${v.value}`)
                              .join(' · ')
                          : ''}
                      </p>
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        {item.quantity} ×{' '}
                        <Currency currency="COP" value={item.price} />
                      </p>
                    </div>
                    <span className="shrink-0 font-mono font-semibold text-sm tabular-nums">
                      <Currency
                        currency="COP"
                        value={item.price * item.quantity}
                      />
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <section aria-label="Order totals" className="mb-10">
            <div className="rounded-md border border-border bg-card p-5">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">
                    <Currency currency="COP" value={order.subtotal} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envió</span>
                  <span className="tabular-nums">
                    {order.deliveryFee === 0 ? (
                      <span className="text-emerald-500">Gratis</span>
                    ) : (
                      <Currency currency="COP" value={order.deliveryFee ?? 0} />
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="tabular-nums">
                    <Currency currency="COP" value={order.discount} />
                  </span>
                </div>
                <div className="my-1 h-px bg-border" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="tabular-nums">
                    <Currency currency="COP" value={order.total} />
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-center">
            <Link
              className="flex items-center gap-1.5 font-mono text-muted-foreground text-sm transition-colors hover:text-foreground"
              to="/products/all"
            >
              <ShoppingBag className="size-3.5" />
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
