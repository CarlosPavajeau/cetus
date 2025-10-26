import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import consola from 'consola'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PackageIcon,
  TruckIcon,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createOrder } from '@/api/orders'
import { AddressFields } from '@/components/address-fields'
import { Currency } from '@/components/currency'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderItemView } from '@/components/order/order-item-view'
import { SubmitButton } from '@/components/submit-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ItemGroup } from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { useCustomer } from '@/hooks/customers'
import { useDeliveryFee } from '@/hooks/orders'
import { type CreateOrder, CreateOrderSchema } from '@/schemas/orders'
import { useCart } from '@/store/cart'

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
    source.map((item) => ({
      productName: item.product.name,
      variantId: item.product.variantId,
      quantity: item.quantity,
      price: item.product.price,
      imageUrl: item.product.imageUrl,
    })) as CreateOrder['items']

  const form = useForm({
    resolver: arktypeResolver(CreateOrderSchema),
    defaultValues: {
      address: '',
      total,
      items: toOrderItems(items),
    },
  })

  const address = form.watch('address')
  useEffect(() => {
    form.setValue('customer.address', address)
  }, [address, form])

  useEffect(() => {
    form.setValue('total', total)

    form.setValue('items', toOrderItems(items))
  }, [form, items, total])

  const { deliveryFee, isLoading: isLoadingDeliveryFee } = useDeliveryFee(
    form.watch('cityId'),
  )

  const navigate = useNavigate()
  const createOrderMutation = useMutation({
    mutationKey: ['orders', 'create'],
    mutationFn: createOrder,
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

const CUSTOMER_ID_DELAY = 750 // milliseconds

type CustomerInfoFieldsProps = {
  form: ReturnType<typeof useForm<CreateOrder>>
}

function CustomerInfoFields({ form }: Readonly<CustomerInfoFieldsProps>) {
  const formCustomerId = form.watch('customer.id')
  const customerId = useDebounce(formCustomerId, CUSTOMER_ID_DELAY)

  const { customer, isLoading } = useCustomer(customerId)

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (customer) {
      form.setValue('customer.name', customer.name)
      form.setValue('customer.email', customer.email)
      form.setValue('customer.phone', customer.phone)
    }
  }, [customer, form, isLoading])

  return (
    <FieldGroup>
      <div className="space-y-4">
        <Controller
          control={form.control}
          name="customer.id"
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Controller
            control={form.control}
            name="customer.email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-email">
                  Correo electrónico
                </FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id="customer-email"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
      </div>

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
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between space-y-2">
          <Button size="sm" variant="ghost">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Volver
          </Button>

          <div className="flex items-center gap-2">
            {isLoadingDeliveryFee && (
              <Badge variant="secondary">
                <Spinner />
                Calculando costo de envío...
              </Badge>
            )}

            {isSubmitting && (
              <Badge variant="secondary">
                <Spinner />
                Creando pedido...
              </Badge>
            )}

            <Badge className="ml-auto">Paso 1 de 2</Badge>
          </div>
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
                      type="submit"
                    >
                      <div className="group flex items-center gap-2">
                        Continuar al pago
                        <ArrowRightIcon
                          aria-hidden="true"
                          className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
                          size={16}
                        />
                      </div>
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
                      <Currency currency="COP" value={deliveryFee?.fee ?? 0} />
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
