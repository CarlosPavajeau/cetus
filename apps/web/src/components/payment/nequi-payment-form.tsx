import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { Order } from '@/api/orders'
import { SubmitButton } from '@/components/submit-button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCreateTransaction } from '@/hooks/payments'
import { useMerchant } from '@/hooks/wompi/use-merchant'
import { PaymentSchema } from '@/schemas/payments'

type Props = {
  order: Order
}

export const NequiPaymentForm = ({ order }: Props) => {
  const form = useForm({
    resolver: arktypeResolver(PaymentSchema),
    defaultValues: {
      type: 'NEQUI',
      acceptance_token: '',
      presigned_acceptance: true,
      presigned_personal_data_auth: true,
    },
  })

  const transactionMutation = useCreateTransaction(order, '')

  const { merchant } = useMerchant('')

  useEffect(() => {
    if (merchant?.data?.presigned_acceptance?.acceptance_token) {
      form.setValue(
        'acceptance_token',
        merchant.data.presigned_acceptance.acceptance_token,
        { shouldValidate: true },
      )
    }
  }, [merchant, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    await transactionMutation.mutateAsync(data)
  })

  return (
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

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <SubmitButton
          disabled={form.formState.isSubmitting}
          form="nequi-payment-form"
          isSubmitting={form.formState.isSubmitting}
        >
          Pagar con Nequi
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
