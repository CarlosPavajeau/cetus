import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import type { Order } from '@/api/orders'
import { PaymentConsent } from '@/components/payment/payment-consent'
import { Button } from '@/components/ui/button'
import { useCreateTransaction } from '@/hooks/payments'
import type { PaymentValues } from '@/schemas/payments'

type Props = {
  order: Order
  children: ReactNode
  buttonText: string
  publicKey: string
}

export const BasePaymentForm = ({
  order,
  children,
  buttonText,
  publicKey,
}: Props) => {
  const form = useFormContext<PaymentValues>()
  const transactionMutation = useCreateTransaction(order, publicKey)

  const onSubmit = form.handleSubmit((values) => {
    transactionMutation.mutate(values)
  })

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="space-y-4">{children}</div>

      <PaymentConsent />

      <Button
        className="group w-full"
        disabled={transactionMutation.isPending}
        size="lg"
      >
        {transactionMutation.isPending && (
          <LoaderCircleIcon
            aria-hidden="true"
            className="animate-spin"
            size={16}
          />
        )}
        {buttonText}
        <ArrowRightIcon
          aria-hidden="true"
          className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
          size={16}
        />
      </Button>
    </form>
  )
}
