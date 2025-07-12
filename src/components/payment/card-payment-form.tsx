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
import type { PaymentValues } from '@/schemas/payments'
import { CreditCardIcon } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import { usePaymentInputs } from 'react-payment-inputs'
import images, { type CardImages } from 'react-payment-inputs/images'

type Props = {
  order: Order
}

export const CardPaymentForm = ({ order }: Props) => {
  const {
    meta,
    getCardNumberProps,
    getExpiryDateProps,
    getCVCProps,
    getCardImageProps,
  } = usePaymentInputs()

  const form = useFormContext<PaymentValues>()

  return (
    <BasePaymentForm order={order} buttonText="Pagar con tarjeta">
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
    </BasePaymentForm>
  )
}
