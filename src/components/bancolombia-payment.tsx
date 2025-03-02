import type { Order } from '@/api/orders'
import {
  type CreateTransactionRequest,
  createBancolombiaTransfer,
} from '@/api/third-party/wompi'
import type { PaymentFormValues } from '@/schemas/payments'
import { valueToCents } from '@/shared/currency'
import { useGenerateIntegritySignature } from '@/shared/wompi'
import { useMutation } from '@tanstack/react-query'
import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { PaymentConsent } from './payment-consent'
import { Button } from './ui/button'

type Props = {
  order: Order
}

export const BancolombiaPayment = ({ order }: Props) => {
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
    mutationFn: createBancolombiaTransfer,
  })

  const form = useFormContext<PaymentFormValues>()

  const onSubmit = form.handleSubmit((values) => {
    const createTransactionRequest = {
      acceptance_token: values.acceptance_token,
      amount_in_cents: valueToCents(order.total),
      currency: 'COP',
      signature: signature ?? '',
      customer_email: order.customer.email,
      payment_method: {
        type: 'BANCOLOMBIA_TRANSFER',
        user_type: 'PERSON',
        payment_description: `Pago de ${order.total}`,
        ecommerce_url: redirect,
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

  useEffect(() => {
    if (createTransactionMutation.isSuccess) {
      const url = createTransactionMutation.data

      window.open(url, '_self')
    }
  }, [createTransactionMutation])

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
        Pagar con Bancolombia
        <ArrowRightIcon
          className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
          size={16}
          aria-hidden="true"
        />
      </Button>
    </form>
  )
}
