import type { Order } from '@/api/orders'
import { PaymentConsent } from '@/components/payment/payment-consent'
import { Button } from '@/components/ui/button'
import { useCreateTransaction } from '@/hooks/payments'
import type { PaymentValues } from '@/schemas/payments'
import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

type Props = {
  order: Order
  children: ReactNode
  buttonText: string
}

export const BasePaymentForm = ({ order, children, buttonText }: Props) => {
  const form = useFormContext<PaymentValues>()
  const transactionMutation = useCreateTransaction(order)

  const onSubmit = form.handleSubmit((values) => {
    transactionMutation.mutate(values)
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">{children}</div>

      <PaymentConsent />

      <Button
        size="lg"
        className="group w-full"
        disabled={transactionMutation.isPending}
      >
        {transactionMutation.isPending && (
          <LoaderCircleIcon
            className="animate-spin"
            size={16}
            aria-hidden="true"
          />
        )}
        {buttonText}
        <ArrowRightIcon
          className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
          size={16}
          aria-hidden="true"
        />
      </Button>
    </form>
  )
}
