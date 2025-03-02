import type { Order } from '@/api/orders'
import {
  type CreateTransactionRequest,
  createTransaction,
} from '@/api/third-party/wompi'
import type { PaymentFormValues } from '@/schemas/payments'
import { valueToCents } from '@/shared/currency'
import { useGenerateIntegritySignature } from '@/shared/wompi'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
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

export const NequiPaymentForm = ({ order }: Props) => {
  const amount = valueToCents(order.total)
  const reference = order.id
  const integritySecret = import.meta.env.PUBLIC_WOMPI_INTEGRITY_SECRET
  const redirect = window.location.origin + `/orders/${order.id}/confirmation`

  const { isLoading, signature } = useGenerateIntegritySignature(
    reference,
    amount,
    integritySecret,
  )

  const createTransactionMutation = useMutation({
    mutationKey: ['create-transaction', order.id],
    mutationFn: createTransaction,
  })

  const form = useFormContext<PaymentFormValues>()

  const onSubmit = form.handleSubmit((values) => {
    if (values.type !== 'NEQUI') {
      return
    }

    const createTransactionRequest = {
      acceptance_token: values.acceptance_token,
      amount_in_cents: valueToCents(order.total),
      currency: 'COP',
      signature: signature ?? '',
      customer_email: order.customer.email,
      payment_method: {
        type: 'NEQUI',
        phone_number: values.phone_number,
      },
      redirect_url: redirect,
      reference: order.id,
      customer_data: {
        phone_number: order.customer.phone,
        full_name: order.customer.name,
      },
    } satisfies CreateTransactionRequest

    createTransactionMutation.mutate(createTransactionRequest)
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
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de teléfono</FormLabel>
              <FormControl>
                <Input type="tel" {...field} />
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
        Pagar con Nequi
        <ArrowRightIcon
          className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
          size={16}
          aria-hidden="true"
        />
      </Button>
    </form>
  )
}
