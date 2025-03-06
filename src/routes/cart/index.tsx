import { createOrder } from '@/api/orders'
import { AddressFields } from '@/components/address-fields'
import { ContentLayout } from '@/components/content-layout'
import { Currency } from '@/components/currency'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { OrderItems } from '@/components/order-items'
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
import { type CreateOrderFormValues, createOrderSchema } from '@/schemas/orders'
import { useCart } from '@/store/cart'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

export const Route = createFileRoute('/cart/')({
  component: RouteComponent,
})

function RouteComponent() {
  const cart = useCart()
  const { items, count } = cart

  const total = items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
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

  const createOrderMutation = useMutation({
    mutationKey: ['orders', 'create'],
    mutationFn: createOrder,
  })

  const onSubmit = form.handleSubmit((values) => {
    createOrderMutation.mutate(values)
  })

  const navigate = useNavigate()
  useEffect(() => {
    if (createOrderMutation.isSuccess) {
      const orderId = createOrderMutation.data

      navigate({
        to: `/orders/${orderId}/checkout`,
        replace: true,
      })
    }
  }, [createOrderMutation, navigate])

  return (
    <DefaultPageLayout>
      <PageHeader title="Verifica los productos de tu carrito para continuar con tu pedido" />

      <Form {...form}>
        <form onSubmit={onSubmit}>
          <ContentLayout>
            <div className="space-y-6">
              <OrderItems
                items={items.map((item) => ({
                  productId: item.product.id,
                  productName: item.product.name,
                  imageUrl: item.product.imageUrl,
                  price: item.product.price,
                  quantity: item.quantity,
                }))}
                title="Productos en tu carrito"
                editable={true}
                onRemove={(productId) => {
                  const item = items.find((i) => i.product.id === productId)
                  if (item) {
                    cart.remove(item.product)
                  }
                }}
                onQuantityChange={(productId, newQuantity) => {
                  const item = items.find((i) => i.product.id === productId)
                  if (item) {
                    if (newQuantity > item.quantity) {
                      cart.add(item.product)
                    } else if (newQuantity < item.quantity) {
                      cart.reduce(item.product)
                    }
                  }
                }}
              />
            </div>

            <div className="flex flex-col justify-between space-y-8 md:pl-4">
              <div className="space-y-6">
                <h2 className="font-medium text-lg">
                  Datos de envío y contacto
                </h2>

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
                        <FormLabel>Nombre</FormLabel>
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

                  <AddressFields />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Productos</span>
                    <span>{count}</span>
                  </div>

                  {form.watch('cityId') && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Costo de envío
                      </span>
                      <span>
                        {form.watch('cityId') ===
                        'f97957e9-d820-4858-ac26-b5d03d658370' ? (
                          <Currency value={5000} currency="COP" />
                        ) : (
                          <Currency value={15000} currency="COP" />
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>
                      <Currency value={total} currency="COP" />
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground text-xs">
                    El costo del envio es cancelado al momento de la entrega de
                    los productos.
                  </span>
                </div>

                <Button
                  className="group w-full"
                  size="lg"
                  disabled={createOrderMutation.isPending || items.length === 0}
                >
                  {createOrderMutation.isPending && (
                    <LoaderCircleIcon
                      className="animate-spin"
                      size={16}
                      aria-hidden="true"
                    />
                  )}
                  Continuar con el pago
                  <ArrowRightIcon
                    className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
                    size={16}
                    aria-hidden="true"
                  />
                </Button>
              </div>
            </div>
          </ContentLayout>
        </form>
      </Form>
    </DefaultPageLayout>
  )
}
