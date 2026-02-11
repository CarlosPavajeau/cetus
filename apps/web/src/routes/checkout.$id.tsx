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
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { PaymentMethods } from '@cetus/web/features/checkout/components/payment-methods'
import {
  MobilePaymentOrderSummary,
  PaymentOrderSummary,
} from '@cetus/web/features/checkout/components/payment-order-summary'
import { setStoreId } from '@cetus/web/functions/store-slug'
import { setupApiClient } from '@cetus/web/lib/api/setup'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import {
  ArrowLeft01Icon,
  SecurityCheckIcon,
  Store03Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'

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
  const hasMercadoPago = store.isConnectedToMercadoPago

  if (publicKey) {
    setWompiConfig({
      publicKey,
      environment: store.slug === 'cantte' ? 'sandbox' : 'production',
    })
  }

  return (
    <DefaultPageLayout>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:max-w-7xl">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link to="/checkout">
              <HugeiconsIcon icon={ArrowLeft01Icon} />
              <span className="sr-only">Volver al checkout</span>
            </Link>
          </Button>
          <div>
            <h1 className="font-heading font-semibold text-xl tracking-tight lg:text-2xl">
              Pago del pedido
            </h1>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <HugeiconsIcon className="size-3.5" icon={SecurityCheckIcon} />
              <span className="text-xs lg:text-sm">
                Pago seguro y protegido
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="lg:hidden">
              <MobilePaymentOrderSummary order={order} />
            </div>

            <div className="rounded-md border bg-card p-5 lg:p-6">
              <div className="mb-4">
                <h2 className="font-medium text-base">Método de pago</h2>
                <p className="text-muted-foreground text-xs">
                  Seleccione su método de pago
                </p>
              </div>

              <PaymentMethods
                hasMercadoPago={hasMercadoPago}
                order={order}
                publicKey={publicKey}
              />
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-20 rounded-md border bg-card p-6">
              <div className="mb-2 flex items-center gap-3">
                <h2 className="font-medium text-base">
                  Resumen de la orden #{order.orderNumber}
                </h2>
              </div>

              <PaymentOrderSummary order={order} />
            </div>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
