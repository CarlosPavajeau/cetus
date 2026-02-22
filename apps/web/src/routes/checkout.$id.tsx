import { api } from '@cetus/api-client'
import { setWompiConfig } from '@cetus/integrations-wompi/config'
import { Button } from '@cetus/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { PaymentMethods } from '@cetus/web/features/checkout/components/payment-methods'
import { PaymentOrderSummary } from '@cetus/web/features/checkout/components/payment-order-summary'
import { setStoreId } from '@cetus/web/functions/store-slug'
import { setupApiClient } from '@cetus/web/lib/api/setup'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import {
  ChevronLeft,
  Payment01Icon,
  Store03Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'
import { FrontStoreHeader } from '../components/front-store/front-store-header'
import { RedeemCoupon } from '../features/coupons/components/redeem-coupon'

export const Route = createFileRoute('/checkout/$id')({
  loader: async ({ params }) => {
    const { id } = params
    const order = await api.orders.getById(id)

    if (!order) {
      throw notFound()
    }

    const store = await api.stores.getById(order.storeId)

    setStoreId({
      data: {
        id: store.id,
      },
    })

    setupApiClient(store.id)

    return { order, store }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { order, store } = Route.useLoaderData()
  const setStore = useTenantStore((state) => state.actions.setStore)

  useEffect(() => {
    if (!store) {
      return
    }

    setStore(store)
  }, [setStore, store])

  if (!store) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Store03Icon} />
          </EmptyMedia>
          <EmptyTitle>Tienda no encontrada</EmptyTitle>
          <EmptyDescription>
            No se pudo encontrar la tienda asociada a este pedido.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/">Volver al inicio</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const publicKey = store.wompiPublicKey
  const integritySecret = store.wompiIntegrityKey
  const hasMercadoPago = store.isConnectedToMercadoPago

  if (publicKey) {
    setWompiConfig({
      publicKey,
      environment: store.slug === 'cantte' ? 'sandbox' : 'production',
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FrontStoreHeader
        hasCustomDomain={Boolean(store.customDomain)}
        store={store}
      />

      <div className="border-border border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="mb-1 font-mono text-muted-foreground text-xs uppercase tracking-widest">
              Checkout
            </p>
          </div>
          <Link
            className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs transition-colors hover:text-foreground"
            to="/cart"
          >
            <HugeiconsIcon className="size-3.5" icon={ChevronLeft} />
            Volver al carrito
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  className="size-4 text-muted-foreground"
                  icon={Payment01Icon}
                />
                <h2 className="font-bold text-xl tracking-tight">
                  Información de pago
                </h2>
              </div>

              <div className="rounded-md border border-border bg-muted/20 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                      Enviar a
                    </p>
                    <p className="mt-0.5 font-medium text-sm">
                      {order.customer.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {order.address}, {order.city}, {order.state}
                    </p>
                  </div>
                </div>
              </div>

              <RedeemCoupon order={order} />

              <PaymentMethods
                hasMercadoPago={hasMercadoPago}
                integritySecret={integritySecret}
                order={order}
                publicKey={publicKey}
              />
            </div>
          </div>

          <div className="h-fit lg:sticky lg:top-4">
            <PaymentOrderSummary order={order} />
          </div>
        </div>
      </div>
    </div>
  )
}
