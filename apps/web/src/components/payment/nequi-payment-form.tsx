import { arktypeResolver } from '@hookform/resolvers/arktype'
import { Controller, useForm } from 'react-hook-form'
import type { Order } from '@/api/orders'
import { PaymentConsent } from '@/components/payment/payment-consent'
import { SubmitButton } from '@/components/submit-button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useCreateTransaction } from '@/hooks/payments'
import { PaymentSchema } from '@/schemas/payments'

type Props = {
  order: Order
  publicKey: string
}

export const NequiPaymentForm = ({ order, publicKey }: Props) => {
  const form = useForm({
    resolver: arktypeResolver(PaymentSchema),
    defaultValues: {
      type: 'NEQUI',
      acceptance_token: '',
    },
  })

  const transactionMutation = useCreateTransaction(order, publicKey)

  const handleSubmit = form.handleSubmit(async (data) => {
    await transactionMutation.mutateAsync(data)
  })

  return (
    <Form {...form}>
      <form id="nequi-payment-form" onSubmit={handleSubmit}>
        <FieldGroup>
          <Controller
            control={form.control}
            name="phone_number"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="phone">Número de teléfono</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id="phone"
                  type="tel"
                />

                <FieldDescription>
                  Recibiras una notificación de cobro en la aplicación Nequi,
                  debes aceptar el pago para completar la compra.
                </FieldDescription>

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <PaymentConsent publicKey={publicKey} />

          <SubmitButton
            disabled={form.formState.isSubmitting}
            form="nequi-payment-form"
            isSubmitting={form.formState.isSubmitting}
          >
            Pagar con Nequi
          </SubmitButton>
        </FieldGroup>
      </form>
    </Form>
  )
}
