import { createOrder, type DeliveryFee } from '@/api/orders'
import { AddressFields } from '@/components/address-fields'
import { Currency } from '@/components/currency'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { PageHeader } from '@/components/page-header'
import { SubmitButton } from '@/components/submit-button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useCustomer } from '@/hooks/customers'
import { useDeliveryFee } from '@/hooks/orders'
import { type CreateOrder, CreateOrderSchema } from '@/schemas/orders'
import { useCart } from '@/store/cart'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import consola from 'consola'
import { ArrowRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
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

  const form = useForm({
    resolver: arktypeResolver(CreateOrderSchema),
    defaultValues: {
      address: '',
      total,
      items: items.map((item) => ({
        productName: item.product.name,
        variantId: item.product.variantId,
        quantity: item.quantity,
        price: item.product.price,
      })),
    },
  })

  const address = form.watch('address')
  useEffect(() => {
    form.setValue('customer.address', address)
  }, [address, form])

  useEffect(() => {
    form.setValue('total', total)

    const formItems = items.map(
      (item) =>
        ({
          productName: item.product.name,
          variantId: item.product.variantId,
          quantity: item.quantity,
          price: item.product.price,
          imageUrl: item.product.imageUrl as string,
        }) satisfies CreateOrder['items'][number],
    )

    form.setValue('items', formItems)
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
    if (customer) {
      form.setValue('customer.name', customer.name)
      form.setValue('customer.email', customer.email)
      form.setValue('customer.phone', customer.phone)
    }
  }, [customer, form])

  return (
    <div className="space-y-6 rounded-md border bg-card p-6">
      <div>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="customer.id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Identificación</FormLabel>
                <FormControl>
                  <Input autoFocus type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customer.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input type="text" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="customer.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer.phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      <div>
        <AddressFields />
      </div>
    </div>
  )
}

type DeliveryFeeInfoProps = {
  deliveryFee: DeliveryFee | undefined
  isLoadingDeliveryFee: boolean
}

function DeliveryFeeInfo({
  deliveryFee,
  isLoadingDeliveryFee,
}: Readonly<DeliveryFeeInfoProps>) {
  return (
    <div>
      <small className="text-muted-foreground text-xs">
        Recuerda que el costo del envío es cancelado al momento de la entrega de
        los productos.{' '}
        {!isLoadingDeliveryFee && deliveryFee !== undefined ? (
          <>
            El costo del envío es de{' '}
            <span className="font-medium">
              <Currency currency="COP" value={deliveryFee.fee} />
            </span>
            .
          </>
        ) : (
          'Debes seleccionar una ciudad para calcular el costo del envío.'
        )}
      </small>
    </div>
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
  } = useCartCheckout()

  if (isEmpty) {
    return <Navigate to="/cart" />
  }

  return (
    <DefaultPageLayout>
      <PageHeader title="Datos de envío" />

      <Form {...form}>
        <form className="space-y-6" onSubmit={onSubmit}>
          <CustomerInfoFields form={form} />

          <DeliveryFeeInfo
            deliveryFee={deliveryFee}
            isLoadingDeliveryFee={isLoadingDeliveryFee}
          />

          <SubmitButton
            className="group w-full"
            disabled={isSubmitting}
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
    </DefaultPageLayout>
  )
}
