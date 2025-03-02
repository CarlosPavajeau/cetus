import type { Order } from '@/api/orders'
import {
  type CreateTransactionRequest,
  createCardToken,
  createTransaction,
} from '@/api/third-party/wompi'
import type { PaymentFormValues } from '@/schemas/payments'
import { valueToCents } from '@/shared/currency'
import { useGenerateIntegritySignature } from '@/shared/wompi'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon, CreditCardIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { usePaymentInputs } from 'react-payment-inputs'
import images, { type CardImages } from 'react-payment-inputs/images'
import { PaymentConsent } from './payment-consent'
import { Button } from './ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { Input } from './ui/input'

type Props = {
  order: Order
}

export const CardPaymentForm = ({ order }: Props) => {
  const amount = valueToCents(order.total)
  const reference = order.id
  const integritySecret = import.meta.env.PUBLIC_WOMPI_INTEGRITY_SECRET
  const redirect = window.location.origin + `/orders/${order.id}/confirmation`

  const { isLoading, signature } = useGenerateIntegritySignature(
    reference,
    amount,
    integritySecret,
  )

  const createCardTransaction = async (values: PaymentFormValues) => {
    if (values.type !== 'CARD') {
      return
    }

    const [expMonth, expYear] = values.card_expiration_date.split('/')

    const cardToken = await createCardToken({
      number: values.card_number.replace(/\s/g, ''),
      card_holder: values.card_holder,
      cvc: values.card_cvc,
      exp_year: expYear.trim(),
      exp_month: expMonth.trim(),
    })

    if (cardToken.status !== 'CREATED') {
      throw new Error('Card token creation failed')
    }

    const createTransactionRequest = {
      acceptance_token: values.acceptance_token,
      amount_in_cents: valueToCents(order.total),
      currency: 'COP',
      signature: signature ?? '',
      customer_email: order.customer.email,
      payment_method: {
        type: 'CARD',
        token: cardToken.data.id,
        installments: 1,
      },
      redirect_url: redirect,
      reference: order.id,
      customer_data: {
        phone_number: order.customer.phone,
        full_name: order.customer.name,
      },
    } satisfies CreateTransactionRequest

    const transaction = await createTransaction(createTransactionRequest)

    return transaction
  }

  const createTransactionMutation = useMutation({
    mutationKey: ['create-transaction', order.id],
    mutationFn: createCardTransaction,
  })

  const {
    meta,
    getCardNumberProps,
    getExpiryDateProps,
    getCVCProps,
    getCardImageProps,
  } = usePaymentInputs()

  const form = useFormContext<PaymentFormValues>()

  const onSubmit = form.handleSubmit((values) => {
    createTransactionMutation.mutate(values)
  })

  const navigate = useNavigate()
  useEffect(() => {
    if (createTransactionMutation.isSuccess) {
      navigate({
        to: `/orders/${order.id}/confirmation`,
        search: {
          id: createTransactionMutation.data?.data.id,
        },
      })
    }
  }, [createTransactionMutation, order, navigate])

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="card_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de tarjeta</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    autoFocus
                    className="peer ps-9 [direction:inherit]"
                    {...getCardNumberProps({
                      onBlur: field.onBlur,
                      onChange: field.onChange,
                    })}
                    placeholder="Número de tarjeta"
                  />

                  <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                    {meta.cardType ? (
                      <svg
                        className="overflow-hidden rounded-sm"
                        {...getCardImageProps({
                          images: images as unknown as CardImages,
                        })}
                        width={20}
                      />
                    ) : (
                      <CreditCardIcon
                        size={16}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="card_expiration_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de expiración</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="[direction:inherit]"
                      {...getExpiryDateProps({
                        onBlur: field.onBlur,
                        onChange: field.onChange,
                      })}
                    />
                  </div>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="card_cvc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CVC</FormLabel>
                <FormControl>
                  <Input
                    className="[direction:inherit]"
                    {...getCVCProps({
                      onBlur: field.onBlur,
                      onChange: field.onChange,
                    })}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="card_holder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del titular</FormLabel>
              <FormControl>
                <Input
                  className="[direction:inherit]"
                  {...field}
                  placeholder="Nombre del titular"
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <PaymentConsent />

      <Button
        size="lg"
        className="group w-full"
        disabled={isLoading || createTransactionMutation.isPending}
      >
        {createTransactionMutation.isPending && (
          <LoaderCircleIcon
            className="animate-spin"
            size={16}
            aria-hidden="true"
          />
        )}
        Pagar con tarjeta
        <ArrowRightIcon
          className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
          size={16}
          aria-hidden="true"
        />
      </Button>
    </form>
  )
}
