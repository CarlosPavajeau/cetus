import { Button } from '@cetus/ui/button'
import { FieldGroup, FieldSet } from '@cetus/ui/field'
import { Form } from '@cetus/ui/form'
import { AddressFields } from '@cetus/web/components/address-fields'
import { FrontStoreHeader } from '@cetus/web/components/front-store/front-store-header'
import { Spinner } from '@cetus/web/components/ui/spinner'
import { CustomerInfoFields } from '@cetus/web/features/checkout/components/customer-info-fields'
import type { OrderSummaryProps } from '@cetus/web/features/checkout/components/order-summary'
import { OrderSummary } from '@cetus/web/features/checkout/components/order-summary'
import { useCartCheckout } from '@cetus/web/features/checkout/hooks/use-cart-checkout'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import {
  ChevronLeft,
  MapPinpoint02Icon,
  SecurityCheckIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_store-required/checkout/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { store } = useTenantStore()
  const {
    isEmpty,
    form,
    onSubmit,
    isSubmitting,
    deliveryFee,
    isLoadingDeliveryFee,
    items,
    total,
  } = useCartCheckout()

  if (isEmpty || !store) {
    return <Navigate to="/cart" />
  }

  const summaryProps: OrderSummaryProps = {
    items,
    total,
    deliveryFee: deliveryFee?.fee,
    isLoadingDeliveryFee,
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
                  icon={MapPinpoint02Icon}
                />
                <h2 className="font-bold text-xl tracking-tight">
                  Dirección y datos de contacto
                </h2>
              </div>
              <Form {...form}>
                <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                  <FieldSet>
                    <CustomerInfoFields form={form} />
                  </FieldSet>

                  <FieldSet>
                    <FieldGroup>
                      <AddressFields />
                    </FieldGroup>
                  </FieldSet>

                  <div className="flex flex-col gap-1.5">
                    <Button
                      className="h-11 w-full rounded-xl font-semibold text-sm sm:w-auto sm:min-w-48"
                      disabled={isSubmitting || isLoadingDeliveryFee}
                      size="lg"
                      type="submit"
                    >
                      {isSubmitting && <Spinner data-icon="inline-start" />}
                      {!isSubmitting && (
                        <HugeiconsIcon
                          data-icon="inline-start"
                          icon={SecurityCheckIcon}
                        />
                      )}
                      Continuar al pago
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          <div className="h-fit lg:sticky lg:top-4">
            <OrderSummary {...summaryProps} />
          </div>
        </div>
      </div>
    </div>
  )
}
