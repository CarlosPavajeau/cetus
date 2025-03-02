import type { Order } from '@/api/orders'
import type { PaymentFormValues } from '@/schemas/payments'
import { useFormContext } from 'react-hook-form'
import { BasePaymentForm } from './base-payment-form'
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
