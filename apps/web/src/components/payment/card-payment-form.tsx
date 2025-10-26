import { arktypeResolver } from '@hookform/resolvers/arktype'
import {
  CalendarIcon,
  CircleUserIcon,
  CreditCardIcon,
  RectangleEllipsis,
} from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { usePaymentInputs } from 'react-payment-inputs'
import images, { type CardImages } from 'react-payment-inputs/images'
import type { Order } from '@/api/orders'
import { PaymentConsent } from '@/components/payment/payment-consent'
import { SubmitButton } from '@/components/submit-button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Form } from '@/components/ui/form'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { useCreateTransaction } from '@/hooks/payments'
import { PaymentSchema } from '@/schemas/payments'

type Props = {
  order: Order
  publicKey: string
}

export const CardPaymentForm = ({ order, publicKey }: Props) => {
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
    },
  })

  const transactionMutation = useCreateTransaction(order, publicKey)

  const handleSubmit = form.handleSubmit(async (data) => {
    await transactionMutation.mutateAsync(data)
  })

  return (
    <Form {...form}>
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <PaymentConsent publicKey={publicKey} />

          <SubmitButton
            disabled={form.formState.isSubmitting}
            form="card-payment-form"
            isSubmitting={form.formState.isSubmitting}
          >
            Pagar con tarjeta
          </SubmitButton>
        </FieldGroup>
      </form>
    </Form>
  )
}
