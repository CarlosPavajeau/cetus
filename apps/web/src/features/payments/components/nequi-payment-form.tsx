import type { Order } from '@cetus/api-client/types/orders'
import { paymentSchema } from '@cetus/schemas/payment.schema'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@cetus/ui/field'
import { Form } from '@cetus/ui/form'
import { Input } from '@cetus/ui/input'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { PaymentConsent } from '@cetus/web/features/payments/components/payment-consent'
import { useCreateTransaction } from '@cetus/web/features/payments/hooks/use-create-transaction'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { Controller, useForm } from 'react-hook-form'

type Props = {
  order: Order
  publicKey: string
  integritySecret: string
}

export const NequiPaymentForm = ({
  order,
  publicKey,
  integritySecret,
}: Props) => {
  const form = useForm({
    resolver: arktypeResolver(paymentSchema),
    defaultValues: {
      type: 'NEQUI',
      acceptance_token: '',
    },
  })

  const transactionMutation = useCreateTransaction(order, integritySecret)

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
