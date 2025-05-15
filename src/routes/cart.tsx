import { type DeliveryFee, createOrder } from '@/api/orders'
import { AddressFields } from '@/components/address-fields'
import { ContentLayout } from '@/components/content-layout'
import { Currency } from '@/components/currency'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderItems } from '@/components/order/order-items'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeliveryFee } from '@/hooks/orders'
import { type CreateOrderFormValues, createOrderSchema } from '@/schemas/orders'
import { useCart } from '@/store/cart'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRightIcon,
  LoaderCircleIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function useCartCheckout() {
  const cart = useCart()
  const { items, count } = cart
  const total = useMemo(
    () =>
      items.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [items],
  )

  const form = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      address: '',
      total,
      items: items.map((item) => ({
        productName: item.product.name,
        productId: item.product.id,
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
    form.setValue(
      'items',
      items.map((item) => ({
        productName: item.product.name,
        imageUrl: item.product.imageUrl,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      })),
    )
  }, [form, items, total])

  const { deliveryFee, isLoading: isLoadingDeliveryFee } = useDeliveryFee(
    form.watch('cityId'),
  )

  const navigate = useNavigate()
  const createOrderMutation = useMutation({
    mutationKey: ['orders', 'create'],
    mutationFn: createOrder,
    onSuccess: (data) => {
      const orderId = data
      navigate({
        to: `/orders/${orderId}/checkout`,
        replace: true,
      })
    },
  })

  const onSubmit = useCallback(
    form.handleSubmit((values) => {
      createOrderMutation.mutate(values)
    }),
    [form, createOrderMutation],
  )

  const handleRemoveItem = useCallback(
    (productId: string) => {
      const item = items.find((i) => i.product.id === productId)
      if (item) {
        cart.remove(item.product)
      }
    },
    [items, cart],
  )

  const handleQuantityChange = useCallback(
    (productId: string, newQuantity: number) => {
      const item = items.find((i) => i.product.id === productId)
      if (item) {
        if (newQuantity > item.quantity) {
          cart.add(item.product)
        } else if (newQuantity < item.quantity) {
          cart.reduce(item.product)
        }
      }
    },
    [items, cart],
  )

  return {
    form,
    items,
    count,
    total,
    onSubmit,
    deliveryFee,
    isLoadingDeliveryFee,
    handleRemoveItem,
    handleQuantityChange,
    isSubmitting: createOrderMutation.isPending,
    isEmpty: items.length === 0,
  }
}

function EmptyCart() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="mb-4 rounded-full bg-muted p-6">
        <ShoppingBagIcon size={32} className="text-muted-foreground" />
      </div>
      <h2 className="mb-2 font-semibold text-2xl">Tu carrito está vacío</h2>
      <p className="mb-6 max-w-md text-muted-foreground">
        Parece que aún no has agregado productos a tu carrito. Explora nuestra
        tienda para encontrar lo que necesitas.
      </p>
      <Button asChild>
        <Link to="/">
          <ShoppingCartIcon className="mr-2" />
          Explorar productos
        </Link>
      </Button>
    </motion.div>
  )
}

type OrderSummaryProps = {
  count: number
  total: number
  deliveryFee?: DeliveryFee
  isLoadingDeliveryFee: boolean
  isSubmitting: boolean
  isEmpty: boolean
  form: ReturnType<typeof useForm<CreateOrderFormValues>>
}

function OrderSummary({
  count,
  total,
  deliveryFee,
  isLoadingDeliveryFee,
  isSubmitting,
  isEmpty,
  form,
}: OrderSummaryProps) {
  const allFieldsValid = !isEmpty && form.formState.isValid

  return (
    <div className="flex flex-col justify-between space-y-8">
      <div className="sticky top-4 space-y-6">
        <div className="rounded-md border bg-card p-6">
          <h2 className="mb-4 font-medium text-lg">Resumen del pedido</h2>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Productos ({count})</span>
              <span>
                <Currency value={total} currency="COP" />
              </span>
            </div>

            {isLoadingDeliveryFee && <Skeleton className="h-5 w-full" />}

            {deliveryFee && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo de envío</span>
                  <span>
                    <Currency value={deliveryFee.fee} currency="COP" />
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>
                <Currency value={total} currency="COP" />
              </span>
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>
                <Currency
                  value={total + (deliveryFee ? deliveryFee.fee : 0)}
                  currency="COP"
                />
              </span>
            </div>
          </div>

          <div className="mt-6 text-muted-foreground text-xs">
            <p>
              El costo del envio es cancelado al momento de la entrega de los
              productos.
            </p>
          </div>
        </div>

        <Button
          className="group w-full"
          size="lg"
          disabled={isSubmitting || isEmpty || !allFieldsValid}
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <LoaderCircleIcon
                className="mr-2 animate-spin"
                size={16}
                aria-hidden="true"
              />
              Procesando...
            </div>
          ) : (
            <>
              Continuar con el pago
              <ArrowRightIcon
                className="-me-1 ml-2 opacity-60 transition-transform group-hover:translate-x-0.5"
                size={16}
                aria-hidden="true"
              />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function CustomerInfoFields({
  form,
}: { form: ReturnType<typeof useForm<CreateOrderFormValues>> }) {
  return (
    <div className="space-y-6 rounded-md border bg-card p-6">
      <div>
        <h2 className="mb-6 font-medium text-lg">Información personal</h2>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="customer.id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Identificación</FormLabel>
                <FormControl>
                  <Input type="text" autoFocus {...field} />
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
                  <Input type="text" {...field} />
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
                    <Input type="email" {...field} />
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
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-6 font-medium text-lg">Información de envío</h2>
        <AddressFields />
      </div>
    </div>
  )
}

function CartPage() {
  const {
    form,
    items,
    count,
    total,
    onSubmit,
    deliveryFee,
    isLoadingDeliveryFee,
    handleRemoveItem,
    handleQuantityChange,
    isSubmitting,
    isEmpty,
  } = useCartCheckout()

  if (isEmpty) {
    return (
      <DefaultPageLayout>
        <EmptyCart />
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <PageHeader title="Tu carrito de compras" />

      <AnimatePresence mode="wait">
        {isEmpty ? (
          <EmptyCart />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Form {...form}>
              <form onSubmit={onSubmit}>
                <ContentLayout>
                  <div className="space-y-6">
                    <CustomerInfoFields form={form} />
                  </div>

                  <div className="space-y-6">
                    <div>
                      <OrderItems
                        items={items.map((item) => ({
                          productId: item.product.id,
                          productName: item.product.name,
                          imageUrl: item.product.imageUrl,
                          price: item.product.price,
                          quantity: item.quantity,
                        }))}
                        title="Productos en tu carrito"
                        editable
                        onRemove={handleRemoveItem}
                        onQuantityChange={handleQuantityChange}
                      />
                    </div>

                    <OrderSummary
                      count={count}
                      total={total}
                      deliveryFee={deliveryFee}
                      isLoadingDeliveryFee={isLoadingDeliveryFee}
                      isSubmitting={isSubmitting}
                      isEmpty={isEmpty}
                      form={form}
                    />
                  </div>
                </ContentLayout>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>
    </DefaultPageLayout>
  )
}
