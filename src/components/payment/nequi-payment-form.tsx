import type { Order } from '@/api/orders'
import { BasePaymentForm } from '@/components/payment/base-payment-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { PaymentFormValues } from '@/schemas/payments'
import { useFormContext } from 'react-hook-form'

type Props = {
  order: Order
}

export const NequiPaymentForm = ({ order }: Props) => {
  const form = useFormContext<PaymentFormValues>()

  return (
    <BasePaymentForm order={order} buttonText="Pagar con Nequi">
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
    </BasePaymentForm>
  )
}
