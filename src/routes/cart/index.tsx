import { createOrder } from '@/api/orders'
import { Currency } from '@/components/currency'
import { Image } from '@/components/image'
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
import { getImageUrl } from '@/shared/cdn'
import { useCart } from '@/store/cart'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon, LoaderCircleIcon, Trash2Icon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { type TypeOf, z } from 'zod'

export const Route = createFileRoute('/cart/')({
  component: RouteComponent,
})

const createOrderSchema = z.object({
  address: z.string(),
  total: z.coerce.number(),
  items: z.array(
    z.object({
      productName: z.string(),
      imageUrl: z.string().optional(),
      productId: z.string(),
      quantity: z.coerce.number(),
      price: z.coerce.number(),
    }),
  ),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
  }),
})

type FormValues = TypeOf<typeof createOrderSchema>

function RouteComponent() {
  const cart = useCart()
  const { items, count } = cart

  const total = items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  )

  const form = useForm<FormValues>({
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
    <>
      <header className="before:-inset-x-32 relative mb-14 before:absolute before:bottom-0 before:h-px before:bg-[linear-gradient(to_right,--theme(--color-border/.3),--theme(--color-border)_200px,--theme(--color-border)_calc(100%-200px),--theme(--color-border/.3))]">
        <div
          className="before:-bottom-px before:-left-12 before:-ml-px after:-right-12 after:-bottom-px after:-mr-px before:absolute before:z-10 before:size-[3px] before:bg-ring/50 after:absolute after:z-10 after:size-[3px] after:bg-ring/50"
          aria-label="hidden"
        ></div>

        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <h1 className="font-bold font-heading text-2xl text-foreground">
              Cetus
            </h1>
          </Link>

          <div className="flex items-center gap-4 sm:gap-8">
            <Link to="/" className="flex items-center gap-2">
              <h2 className="font-medium text-base leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Inicio
              </h2>
            </Link>
          </div>
        </div>
      </header>

      <main className="grow">
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <div data-home="true">
              <div className="max-w-3xl max-sm:text-center">
                <h1 className="mb-4 font-bold font-heading text-4xl/[1.1] text-foreground tracking-tight md:text-5xl/[1.1]">
                  Verifica los productos de tu carrito para continuar con tu
                  pedido
                </h1>
              </div>

              <div className="relative my-16">
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    <h2 className="font-medium text-lg">
                      Productos en tu carrito
                    </h2>

                    <div className="space-y-4">
                      {items.length > 0 &&
                        items.map((item) => (
                          <div
                            key={item.product.id}
                            className="rounded-lg border bg-card p-4 text-card-foreground"
                          >
                            <div className="flex gap-4">
                              <div className="relative h-24 w-24 rounded-md">
                                <Image
                                  src={getImageUrl(
                                    item.product.imageUrl || 'placeholder.svg',
                                  )}
                                  alt={item.product.name}
                                  layout="fill"
                                  className="rounded-md object-cover"
                                />
                              </div>

                              <div className="flex-1 space-y-2">
                                <div className="flex justify-between">
                                  <h3 className="font-medium">
                                    {item.product.name}
                                  </h3>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive/80"
                                    type="button"
                                    onClick={() => cart.remove(item.product)}
                                  >
                                    <Trash2Icon className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      type="button"
                                      onClick={() => cart.reduce(item.product)}
                                    >
                                      -
                                    </Button>
                                    <span className="w-8 text-center">
                                      {item.quantity}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      type="button"
                                      onClick={() => cart.add(item.product)}
                                    >
                                      +
                                    </Button>
                                  </div>
                                  <div className="ml-auto font-medium">
                                    <Currency
                                      value={item.product.price}
                                      currency="COP"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                      {items.length === 0 && (
                        <div className="py-8 text-center">
                          <h2 className="mb-2 font-medium text-xl">
                            Tu carrito está vacío
                          </h2>
                          <p className="text-muted-foreground">
                            ¡Agrega productos para continuar con tu pedido!
                          </p>
                        </div>
                      )}
                    </div>
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

                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dirección</FormLabel>
                              <FormControl>
                                <Input type="text" {...field} />
                              </FormControl>

                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Productos
                          </span>
                          <span>{count}</span>
                        </div>

                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total</span>
                          <span>
                            <Currency value={total} currency="COP" />
                          </span>
                        </div>
                      </div>

                      <Button
                        className="group w-full"
                        size="lg"
                        disabled={
                          createOrderMutation.isPending || items.length === 0
                        }
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
                </div>
              </div>
            </div>
          </form>
        </Form>
      </main>
    </>
  )
}
