import type { Order } from '@/api/orders'
import { useMerchant } from '@/hooks/wompi/use-merchant'
import { cn } from '@/shared/cn'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CreditCardIcon,
  EuroIcon,
  LandmarkIcon,
  SmartphoneIcon,
} from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { type TypeOf, z } from 'zod'
import { BancolombiaPayment } from './bancolombia-payment'
import { CardPaymentForm } from './card-payment-form'
import { NequiPaymentForm } from './nequi-payment-form'
import { Form } from './ui/form'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'

type Props = {
  order: Order
}

const paymentMethods = [
  {
    id: 'CARD',
    label: 'Tarjeta',
    PaymentIcon: CreditCardIcon,
  },
  {
    id: 'BANCOLOMBIA_TRANSFER',
    label: 'Bancolombia',
    PaymentIcon: LandmarkIcon,
  },
  {
    id: 'PSE',
    label: 'PSE',
    PaymentIcon: EuroIcon,
  },
  {
    id: 'NEQUI',
    label: 'Nequi',
    PaymentIcon: SmartphoneIcon,
  },
]

const cardPaymentSchema = z.object({
  type: z.literal('CARD'),
  card_number: z.string(),
  card_holder: z.string(),
  card_cvc: z.string(),
  card_expiration_date: z.string(),

  presigned_acceptance: z.boolean(),
  presigned_personal_data_auth: z.boolean(),
  acceptance_token: z.string(),
})

const bancolombiaPaymentSchema = z.object({
  type: z.literal('BANCOLOMBIA_TRANSFER'),

  presigned_acceptance: z.boolean(),
  presigned_personal_data_auth: z.boolean(),
  acceptance_token: z.string(),
})

const psePaymentSchema = z.object({
  type: z.literal('PSE'),

  presigned_acceptance: z.boolean(),
  presigned_personal_data_auth: z.boolean(),
  acceptance_token: z.string(),
})

const nequiPaymentSchema = z.object({
  type: z.literal('NEQUI'),
  phone_number: z.string(),

  presigned_acceptance: z.boolean(),
  presigned_personal_data_auth: z.boolean(),
  acceptance_token: z.string(),
})

const paymentSchema = z.union([
  cardPaymentSchema,
  bancolombiaPaymentSchema,
  psePaymentSchema,
  nequiPaymentSchema,
])

export type PaymentFormValues = TypeOf<typeof paymentSchema>

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

  return (
    <Form {...form}>
      <div className="space-y-6">
        <RadioGroup
          className="grid-cols-4"
          value={paymentMethod}
          onValueChange={setPaymentMethod}
        >
          {paymentMethods.map(({ id, label, PaymentIcon }) => (
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
              <PaymentIcon
                className="opacity-60"
                size={20}
                aria-hidden="true"
              />
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

        {paymentMethod === 'CARD' && <CardPaymentForm order={order} />}

        {paymentMethod === 'BANCOLOMBIA_TRANSFER' && (
          <BancolombiaPayment order={order} />
        )}

        {paymentMethod === 'NEQUI' && <NequiPaymentForm order={order} />}
      </div>
    </Form>
  )
}
