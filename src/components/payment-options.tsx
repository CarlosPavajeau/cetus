import type { Order } from '@/api/orders'
import { useMerchant } from '@/hooks/wompi/use-merchant'
import { type PaymentFormValues, paymentSchema } from '@/schemas/payments'
import { cn } from '@/shared/cn'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreditCardIcon, SmartphoneIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { BancolombiaPayment } from './bancolombia-payment'
import { CardPaymentForm } from './card-payment-form'
import { BancolombiaLogo, PSELogo } from './icons'
import { NequiPaymentForm } from './nequi-payment-form'
import { PsePaymentForm } from './pse-payment-form'
import { Form } from './ui/form'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'

type Props = {
  order: Order
}

const PAYMENT_METHODS = [
  {
    id: 'CARD',
    label: 'Tarjeta',
    PaymentIcon: CreditCardIcon,
  },
  {
    id: 'BANCOLOMBIA_TRANSFER',
    label: 'Bancolombia',
    PaymentIcon: BancolombiaLogo,
  },
  {
    id: 'PSE',
    label: 'PSE',
    PaymentIcon: PSELogo,
  },
  {
    id: 'NEQUI',
    label: 'Nequi',
    PaymentIcon: SmartphoneIcon,
  },
] as const

const PAYMENT_FORMS = {
  CARD: CardPaymentForm,
  BANCOLOMBIA_TRANSFER: BancolombiaPayment,
  PSE: PsePaymentForm,
  NEQUI: NequiPaymentForm,
} as const

export function PaymentOptions({ order }: Props) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
  })

  const paymentMethod = form.watch('type')
  const setPaymentMethod = (value: string) => {
    form.setValue('type', value as PaymentFormValues['type'])
  }

  const { merchant } = useMerchant()

  useEffect(() => {
    if (merchant) {
      form.setValue(
        'acceptance_token',
        merchant.data.presigned_acceptance.acceptance_token,
      )
    }
  }, [merchant, form])

  const PaymentForm = paymentMethod ? PAYMENT_FORMS[paymentMethod] : null

  return (
    <Form {...form}>
      <div className="space-y-6">
        <RadioGroup
          className="grid-cols-4"
          value={paymentMethod}
          onValueChange={setPaymentMethod}
        >
          {PAYMENT_METHODS.map(({ id, label, PaymentIcon }) => (
            <div
              key={id}
              className={cn(
                'relative flex flex-col items-center gap-3 rounded-md border border-input px-2 py-3 text-center shadow-xs outline-none transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-data-[state=checked]:border-ring',
                {
                  'border-ring ring-[3px] ring-ring/50': paymentMethod === id,
                },
              )}
            >
              <RadioGroupItem id={id} value={id} className="sr-only" />
              <PaymentIcon className="size-6" size={20} aria-hidden="true" />
              <label
                htmlFor={id}
                className={cn(
                  'cursor-pointer font-medium text-foreground text-xs leading-none after:absolute after:inset-0',
                )}
              >
                {label}
              </label>
            </div>
          ))}
        </RadioGroup>

        {PaymentForm && <PaymentForm order={order} />}
      </div>
    </Form>
  )
}
