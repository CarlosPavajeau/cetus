import { createOrder } from '@/api/orders'
import { AddressFields } from '@/components/address-fields'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { PageHeader } from '@/components/page-header'
import { PaymentOptions } from '@/components/payment/payment-options'
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
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'
import { useDeliveryFee } from '@/hooks/orders'
import { type CreateOrderFormValues, createOrderSchema } from '@/schemas/orders'
import { useCart } from '@/store/cart'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const checkoutSearchSchema = z.object({
  id: z.string().optional(),
})

export const Route = createFileRoute('/checkout')({
  component: RouteComponent,
  validateSearch: checkoutSearchSchema,
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

  const search = Route.useSearch()
  const [orderId] = useState<string | undefined>(search.id)
  const navigate = useNavigate()
  const createOrderMutation = useMutation({
    mutationKey: ['orders', 'create'],
    mutationFn: createOrder,
    onSuccess: (data) => {
      const orderId = data
      navigate({
        to: '/checkout',
        search: { id: orderId },
      })
    },
  })

  const onSubmit = useCallback(
    form.handleSubmit((values) => {
      createOrderMutation.mutate(values)
    }),
    [form, createOrderMutation],
  )

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
    orderId,
  }
}

function CustomerInfoFields({
  form,
}: { form: ReturnType<typeof useForm<CreateOrderFormValues>> }) {
  return (
    <div className="space-y-6 rounded-md border bg-card p-6">
      <div>
        <h2 className="mb-6 font-medium text-lg">Información de envío</h2>

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
        <AddressFields />
      </div>
    </div>
  )
}

const steps = [
  {
    step: 1,
    title: 'Envió',
  },
  {
    step: 2,
    title: 'Pago',
  },
]

function RouteComponent() {
  const { isEmpty, form, onSubmit, isSubmitting, orderId } = useCartCheckout()
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    if (orderId) {
      setCurrentStep(2)
    }
  }, [orderId])

  const navigate = Route.useNavigate()
  if (isEmpty) {
    navigate({ to: '/cart' })
    return null
  }

  return (
    <DefaultPageLayout>
      <PageHeader title="Tu pedido" />

      <div className="space-y-8 text-center">
        <Stepper value={currentStep} onValueChange={setCurrentStep}>
          {steps.map(({ step, title }) => (
            <StepperItem
              key={step}
              step={step}
              className="not-last:flex-1 max-md:items-start"
              loading={isSubmitting}
            >
              <StepperTrigger className="rounded max-md:flex-col">
                <StepperIndicator />
                <div className="text-center md:text-left">
                  <StepperTitle>{title}</StepperTitle>
                </div>
              </StepperTrigger>
              {step < steps.length && (
                <StepperSeparator className="max-md:mt-3.5 md:mx-4" />
              )}
            </StepperItem>
          ))}
        </Stepper>
      </div>

      <div className="mt-8">
        {currentStep === 1 && (
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-6">
              <CustomerInfoFields form={form} />

              <Button
                type="submit"
                className="group w-full"
                disabled={isSubmitting}
              >
                Continuar al pago
                <ArrowRightIcon
                  className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
                  size={16}
                  aria-hidden="true"
                />
              </Button>
            </form>
          </Form>
        )}

        {currentStep === 2 && orderId && (
          <div className="space-y-6">
            <PaymentOptions orderId={orderId} />
          </div>
        )}
      </div>
    </DefaultPageLayout>
  )
}
