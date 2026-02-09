import { api } from '@cetus/api-client'
import type {
  CreateOrder,
  CreateOrderItem,
} from '@cetus/api-client/types/orders'
import { createOrderSchema } from '@cetus/schemas/order.schema'
import { Button } from '@cetus/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Form } from '@cetus/ui/form'
import { Input } from '@cetus/ui/input'
import { ItemGroup } from '@cetus/ui/item'
import { Separator } from '@cetus/ui/separator'
import { AddressFields } from '@cetus/web/components/address-fields'
import { Currency } from '@cetus/web/components/currency'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { customerQueries } from '@cetus/web/features/customers/queries'
import { OrderItemView } from '@cetus/web/features/orders/components/order-item-view'
import { orderQueries } from '@cetus/web/features/orders/queries'
import { useCart } from '@cetus/web/store/cart'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import consola from 'consola'
import { PackageIcon, TruckIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

export const Route = createFileRoute('/_store-required/checkout/')({
  ssr: false,
  component: RouteComponent,
})

function useCartCheckout() {
  const { items, count } = useCart()
  const total = useMemo(
    () =>
      items.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [items],
  )

  const toOrderItems = (source: typeof items) =>
    source.map(
      (item) =>
        ({
          variantId: item.product.variantId,
          quantity: item.quantity,
        }) satisfies CreateOrderItem,
    )

  const form = useForm({
    resolver: arktypeResolver(createOrderSchema),
    defaultValues: {
      items: toOrderItems(items),
      customer: {
        documentNumber: '',
      },
    },
  })

  const { data: deliveryFee, isLoading: isLoadingDeliveryFee } = useQuery(
    orderQueries.deliveryFees.detail(form.watch('shipping.cityId')),
  )

  const navigate = useNavigate()
  const createOrderMutation = useMutation({
    mutationKey: ['orders', 'create'],
    mutationFn: api.orders.create,
    onSuccess: (data) => {
      const orderId = data.id
      navigate({
        to: '/checkout/$id',
        params: {
          id: orderId,
        },
      })
    },
    onError: (error) => {
      consola.error('Error creating order:', error)
      toast.error(
        'Ha ocurrido un error en la creación de la orden. Intente de nuevo',
      )
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    createOrderMutation.mutate(values)
  })

  return {
    form,
    items,
    count,
    total,
    onSubmit,
    deliveryFee,
    isLoadingDeliveryFee,
    isSubmitting: createOrderMutation.isPending,
    isEmpty: items.length === 0,
  }
}

const debounceDelay = 300

type CustomerInfoFieldsProps = {
  form: ReturnType<typeof useForm<CreateOrder>>
}

function CustomerInfoFields({ form }: Readonly<CustomerInfoFieldsProps>) {
  const phone = useDebounce(form.watch('customer.phone'), debounceDelay)

  const { data: customer, isLoading } = useQuery(
    customerQueries.detailByPhone(phone),
  )

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (customer) {
      form.setValue('customer.name', customer.name)
      form.setValue('customer.email', customer.email)
      form.setValue('customer.documentNumber', customer.documentNumber)
      form.setValue('customer.documentType', customer.documentType)
    }
  }, [customer, form, isLoading])

  return (
    <FieldGroup>
      <Controller
        control={form.control}
        name="customer.phone"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="customer-phone">Teléfono</FieldLabel>
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              id="customer-phone"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="customer.documentNumber"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="customer-id">Identificación</FieldLabel>
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              autoComplete="off"
              id="customer-id"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="customer.name"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="customer-name">Nombre completo</FieldLabel>
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              id="customer-name"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="customer.email"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="customer-email">Correo electrónico</FieldLabel>
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              id="customer-email"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <AddressFields />
    </FieldGroup>
  )
}

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

  return (
    <DefaultPageLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-2">
        <div>
          <Button size="sm" variant="ghost">
            <HugeiconsIcon data-icon="inline-start" icon={ArrowLeft01Icon} />
            Volver
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="col-span-2 lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <TruckIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Datos de envío</CardTitle>
                    <CardDescription>
                      Por favor, ingresa tus datos básicos para continuar con el
                      proceso de compra.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Form {...form}>
                  <form onSubmit={onSubmit}>
                    <CustomerInfoFields form={form} />

                    <small className="text-muted-foreground text-xs">
                      Recuerda que el costo del envío es cancelado al momento de
                      la entrega de los productos.
                    </small>

                    <SubmitButton
                      className="group mt-6 w-full"
                      disabled={isSubmitting || isLoadingDeliveryFee}
                      isSubmitting={isSubmitting}
                      size="lg"
                      type="submit"
                    >
                      Continuar al pago
                    </SubmitButton>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-1 hidden lg:block">
            <Card className="sticky top-20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <PackageIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Resumen de la orden</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ItemGroup className="gap-2">
                  {items.map((item) => (
                    <OrderItemView
                      item={{
                        id: item.product.slug,
                        productName: item.product.name,
                        imageUrl: item.product.imageUrl,
                        optionValues: item.product.optionValues,
                        price: item.product.price,
                        quantity: item.quantity,
                      }}
                      key={`${item.product.variantId}-${item.product.name}`}
                    />
                  ))}
                </ItemGroup>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      <Currency currency="COP" value={total} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="font-medium">
                      {deliveryFee ? (
                        <Currency currency="COP" value={deliveryFee.fee} />
                      ) : (
                        <span>Sin calcular</span>
                      )}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>
                    <Currency
                      currency="COP"
                      value={total + (deliveryFee?.fee ?? 0)}
                    />
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
