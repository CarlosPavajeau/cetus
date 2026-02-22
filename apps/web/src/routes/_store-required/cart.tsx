import { Button, buttonVariants } from '@cetus/ui/button'
import { Currency } from '@cetus/web/components/currency'
import { FrontStoreHeader } from '@cetus/web/components/front-store/front-store-header'
import { Badge } from '@cetus/web/components/ui/badge'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/web/components/ui/empty'
import { CartItemView } from '@cetus/web/features/cart/components/cart-item-view'
import { cn } from '@cetus/web/shared/utils'
import { useCart } from '@cetus/web/store/cart'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { ShoppingBag01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'

export const Route = createFileRoute('/_store-required/cart')({
  component: CartPage,
})

function EmptyCart() {
  const { store } = useTenantStore()
  const hasStore = Boolean(store)
  const hasCustomDomain = Boolean(store?.customDomain)

  return (
    <div>
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon aria-hidden="true" icon={ShoppingBag01Icon} />
          </EmptyMedia>
          <EmptyTitle>Tu carrito está vacío</EmptyTitle>
          <EmptyDescription>
            Parece que aún no has agregado productos a tu carrito. Explora
            nuestra tienda para encontrar lo que necesitas.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link
              className="flex items-center gap-2"
              params={{
                store: store?.slug,
              }}
              to={hasStore && !hasCustomDomain ? '/$store' : '/'}
            >
              Explorar productos
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

function CartPage() {
  const { store } = useTenantStore()

  const cart = useCart()
  const isEmpty = cart.count === 0
  const total = useMemo(
    () =>
      cart.items.reduce(
        (acc, item) => acc + item.product.price * item.quantity,
        0,
      ),
    [cart.items],
  )

  if (!store) {
    return null
  }

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <FrontStoreHeader
          hasCustomDomain={Boolean(store.customDomain)}
          store={store}
        />

        <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
          <EmptyCart />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FrontStoreHeader
        hasCustomDomain={Boolean(store.customDomain)}
        store={store}
      />

      <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
        <div className="mb-16 flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <Badge className="w-fit rounded-md" variant="outline">
              {cart.count} {cart.count > 1 ? 'productos' : 'producto'}
            </Badge>
            <h2 className="text-balance font-bold text-3xl tracking-tight sm:text-4xl">
              Tu carrito de compras
            </h2>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col divide-y divide-border">
              {cart.items.map((item) => (
                <CartItemView
                  item={item}
                  key={`${item.product.productId}:${item.product.variantId}`}
                />
              ))}
            </div>

            <div className="h-fit lg:sticky lg:top-4">
              <div className="rounded-md border border-border bg-card p-6">
                <p className="mb-4 font-mono text-muted-foreground text-xs uppercase tracking-widest">
                  Resumen del pedido
                </p>

                <div className="flex flex-col gap-2 text-sm">
                  {cart.items.map((item) => (
                    <div
                      className="flex items-start justify-between gap-3"
                      key={`${item.product.productId}:${item.product.variantId}`}
                    >
                      <span className="truncate text-muted-foreground">
                        {item.product.name}
                        {item.quantity > 1 && (
                          <span className="ml-1 font-mono text-xs">
                            ×{item.quantity}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        <Currency
                          currency="COP"
                          value={item.product.price * item.quantity}
                        />
                      </span>
                    </div>
                  ))}
                </div>

                <div className="my-4 h-px bg-border" />

                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium tabular-nums">
                      <Currency currency="COP" value={total} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="text-muted-foreground italic tabular-nums">
                      Por calcular
                    </span>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="tabular-nums">
                      <Currency currency="COP" value={total} />
                    </span>
                  </div>
                </div>

                <Link
                  className={cn(
                    buttonVariants(),
                    'mt-5 h-10 w-full font-semibold text-sm',
                  )}
                  to="/checkout"
                >
                  Continuar con la compra
                </Link>

                <p className="mt-3 text-center text-muted-foreground text-xs">
                  El costo del envio es cancelado al momento de la entrega de
                  los productos.
                </p>

                <Link
                  className="mt-3 block text-center font-mono text-muted-foreground text-xs transition-colors hover:text-foreground"
                  to="/products/all"
                >
                  ← Seguir comprando
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
