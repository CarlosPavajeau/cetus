import { arktypeResolver } from '@hookform/resolvers/arktype'
import { CreditCardIcon, SmartphoneIcon } from 'lucide-react'
import { memo, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { BancolombiaLogo, PSELogo } from '@/components/icons'
import { BancolombiaPayment } from '@/components/payment/bancolombia-payment'
import { CardPaymentForm } from '@/components/payment/card-payment-form'
import { NequiPaymentForm } from '@/components/payment/nequi-payment-form'
import { PsePaymentForm } from '@/components/payment/pse-payment-form'
import { Form } from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrder } from '@/hooks/orders'
import { useMerchant } from '@/hooks/wompi/use-merchant'
import { PaymentSchema, type PaymentValues } from '@/schemas/payments'
import { cn } from '@/shared/cn'

type PaymentMethodID = 'CARD' | 'BANCOLOMBIA_TRANSFER' | 'PSE' | 'NEQUI'

interface PaymentMethod {
  id: PaymentMethodID
  label: string
  PaymentIcon: React.ElementType
}

interface PaymentOptionsProps {
  orderId: string
}

const PAYMENT_METHODS: readonly PaymentMethod[] = [
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

interface PaymentMethodItemProps extends PaymentMethod {
  isSelected: boolean
}

const PaymentMethodItem = memo(function PaymentMethodItemComponent({
  id,
  label,
  PaymentIcon,
  isSelected,
}: Readonly<PaymentMethodItemProps>) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-3 rounded-md border border-input px-2 py-3 text-center shadow-xs outline-none transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-data-[state=checked]:border-ring',
        {
          'border-ring ring-[3px] ring-ring/50': isSelected,
        },
      )}
    >
      <RadioGroupItem className="sr-only" id={id} value={id} />
      <PaymentIcon aria-hidden="true" className="size-6" size={20} />
      <label
        className="cursor-pointer font-medium text-foreground text-xs leading-none after:absolute after:inset-0"
        htmlFor={id}
      >
        {label}
      </label>
    </div>
  )
})

export function PaymentOptions({ orderId }: Readonly<PaymentOptionsProps>) {
  const form = useForm({
    resolver: arktypeResolver(PaymentSchema),
    defaultValues: {
      type: 'CARD',
      acceptance_token: '',
    },
  })
  const { order, isLoading } = useOrder(orderId)

  const paymentMethod = form.watch('type')

  const setPaymentMethod = (value: string) => {
    form.setValue('type', value as PaymentValues['type'], {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  const { merchant } = useMerchant()

  useEffect(() => {
    if (merchant?.data?.presigned_acceptance?.acceptance_token) {
      form.setValue(
        'acceptance_token',
        merchant.data.presigned_acceptance.acceptance_token,
        { shouldValidate: true },
      )
    }
  }, [merchant, form])

  const PaymentForm = useMemo(
    () => (paymentMethod ? PAYMENT_FORMS[paymentMethod] : null),
    [paymentMethod],
  )

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />
  }

  if (!order) {
    return null
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <RadioGroup
          className="grid-cols-4"
          onValueChange={setPaymentMethod}
          value={paymentMethod}
        >
          {PAYMENT_METHODS.map((method) => (
            <PaymentMethodItem
              key={method.id}
              {...method}
              isSelected={paymentMethod === method.id}
            />
          ))}
        </RadioGroup>

        {PaymentForm && <PaymentForm order={order} />}
      </div>
    </Form>
  )
}
