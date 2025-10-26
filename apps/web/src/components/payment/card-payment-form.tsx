import { arktypeResolver } from '@hookform/resolvers/arktype'
import consola from 'consola'
import {
  CalendarIcon,
  CircleUserIcon,
  CreditCardIcon,
  RectangleEllipsis,
} from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { usePaymentInputs } from 'react-payment-inputs'
import images, { type CardImages } from 'react-payment-inputs/images'
import type { Order } from '@/api/orders'
import { SubmitButton } from '@/components/submit-button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { useCreateTransaction } from '@/hooks/payments'
import { useMerchant } from '@/hooks/wompi/use-merchant'
import { PaymentSchema } from '@/schemas/payments'

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

  const form = useForm({
    resolver: arktypeResolver(PaymentSchema),
    defaultValues: {
      type: 'CARD',
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
    consola.log(data)
    await transactionMutation.mutateAsync(data)
  })

  return (
    <form id="card-payment-form" onSubmit={handleSubmit}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="card_number"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="card_number">Número de tarjeta</FieldLabel>

              <InputGroup>
                <InputGroupInput
                  {...getCardNumberProps({
                    onBlur: field.onBlur,
                    onChange: field.onChange,
                  })}
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  id="card-number"
                  placeholder="Número de tarjeta"
                />
                <InputGroupAddon>
                  {meta.cardType ? (
                    <svg
                      className="overflow-hidden rounded-sm"
                      {...getCardImageProps({
                        images: images as unknown as CardImages,
                      })}
                      width={20}
                    />
                  ) : (
                    <CreditCardIcon aria-hidden="true" />
                  )}
                </InputGroupAddon>
              </InputGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <Controller
            control={form.control}
            name="card_expiration_date"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="card-expiration-date">
                  Fecha de expiración
                </FieldLabel>

                <InputGroup>
                  <InputGroupInput
                    {...getExpiryDateProps({
                      onBlur: field.onBlur,
                      onChange: field.onChange,
                    })}
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    id="card-expiration-date"
                  />
                  <InputGroupAddon>
                    <CalendarIcon />
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="card_cvc"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="card-cvc">CVC</FieldLabel>

                <InputGroup>
                  <InputGroupInput
                    {...getCVCProps({
                      onBlur: field.onBlur,
                      onChange: field.onChange,
                    })}
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    id="card-cvc"
                  />
                  <InputGroupAddon>
                    <RectangleEllipsis />
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="card_holder"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="card-holder">Titular</FieldLabel>

              <InputGroup>
                <InputGroupInput
                  {...field}
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  id="card-holder"
                  placeholder="Nombre completo"
                />
                <InputGroupAddon>
                  <CircleUserIcon />
                </InputGroupAddon>
              </InputGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="pt-6">
        <SubmitButton
          disabled={form.formState.isSubmitting}
          form="card-payment-form"
          isSubmitting={form.formState.isSubmitting}
        >
          Pagar con tarjeta
        </SubmitButton>
      </div>
    </form>
  )
}
