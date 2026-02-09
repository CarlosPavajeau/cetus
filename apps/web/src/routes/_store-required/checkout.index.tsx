import { Button } from '@cetus/ui/button'
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@cetus/ui/field'
import { Form } from '@cetus/ui/form'
import { Separator } from '@cetus/ui/separator'
import { AddressFields } from '@cetus/web/components/address-fields'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { Spinner } from '@cetus/web/components/ui/spinner'
import { CustomerInfoFields } from '@cetus/web/features/checkout/components/customer-info-fields'
import type { OrderSummaryProps } from '@cetus/web/features/checkout/components/order-summary'
import {
  MobileOrderSummary,
  OrderSummary,
} from '@cetus/web/features/checkout/components/order-summary'
import { useCartCheckout } from '@cetus/web/features/checkout/hooks/use-cart-checkout'
import { ArrowLeft01Icon, SecurityCheckIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_store-required/checkout/')({
  component: RouteComponent,
})

function RouteComponent() {
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

  if (isEmpty) {
    return <Navigate to="/cart" />
  }

  const summaryProps: OrderSummaryProps = {
    items,
    total,
    deliveryFee: deliveryFee?.fee,
    isLoadingDeliveryFee,
  }

  return (
    <DefaultPageLayout>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:max-w-7xl">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link to="/cart">
              <HugeiconsIcon icon={ArrowLeft01Icon} />
              <span className="sr-only">Volver al carrito</span>
            </Link>
          </Button>
          <div>
            <h1 className="font-heading font-semibold text-xl tracking-tight lg:text-2xl">
              Finalizar compra
            </h1>
            <p className="text-muted-foreground text-xs lg:text-sm">
              Completa tus datos para procesar tu pedido
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="lg:hidden">
              <MobileOrderSummary {...summaryProps} />
            </div>

            <div className="rounded-md border bg-card p-5 lg:p-6">
              <Form {...form}>
                <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                  <FieldSet>
                    <FieldLegend>Datos de contacto</FieldLegend>
                    <FieldDescription>
                      Ingresa tus datos de contacto para procesar tu pedido.
                    </FieldDescription>

                    <CustomerInfoFields form={form} />
                  </FieldSet>

                  <Separator />

                  <FieldSet>
                    <FieldLegend>Dirección de entrega</FieldLegend>
                    <FieldDescription>
                      Ingresa la dirección de entrega para el envío de tus
                      productos.
                    </FieldDescription>
                    <FieldGroup>
                      <AddressFields />
                    </FieldGroup>
                  </FieldSet>

                  <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      El costo del envío se cancela al momento de la entrega de
                      los productos.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Button
                      className="w-full"
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

                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <HugeiconsIcon
                        className="size-3.5"
                        icon={SecurityCheckIcon}
                      />
                      <span className="text-xs">Pago seguro y protegido</span>
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-20 rounded-md border bg-card p-6">
              <div className="mb-2 flex items-center gap-3">
                <h2 className="font-medium text-base">Resumen del pedido</h2>
              </div>

              <OrderSummary {...summaryProps} />
            </div>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
