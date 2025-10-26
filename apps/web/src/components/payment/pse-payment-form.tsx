import { arktypeResolver } from '@hookform/resolvers/arktype'
import { Controller, useForm } from 'react-hook-form'
import type { Order } from '@/api/orders'
import { PaymentConsent } from '@/components/payment/payment-consent'
import { SubmitButton } from '@/components/submit-button'
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTransaction } from '@/hooks/payments'
import { useFinancialInstitutions } from '@/hooks/wompi/use-financial-institutions'
import { PaymentSchema } from '@/schemas/payments'

type Props = {
  order: Order
  publicKey: string
}

export const PsePaymentForm = ({ order, publicKey }: Props) => {
  const form = useForm({
    resolver: arktypeResolver(PaymentSchema),
    defaultValues: {
      type: 'PSE',
      acceptance_token: '',
    },
  })

  const { financialInstitutions, isLoading: isLoadingFinancialInstitutions } =
    useFinancialInstitutions(publicKey)

  const transactionMutation = useCreateTransaction(order, publicKey)

  const handleSubmit = form.handleSubmit(async (data) => {
    await transactionMutation.mutateAsync(data)
  })

  return (
    <Form {...form}>
      <form id="pse-payment-form" onSubmit={handleSubmit}>
        <FieldGroup>
          <Controller
            control={form.control}
            name="financial_institution_code"
            render={({ field, fieldState }) => (
              <Field>
                <FieldContent data-invalid={fieldState.invalid}>
                  <FieldLabel>Banco</FieldLabel>
                </FieldContent>

                <Select
                  disabled={isLoadingFinancialInstitutions}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un banco" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    {financialInstitutions?.map((institution) => (
                      <SelectItem
                        key={institution.financial_institution_code}
                        value={institution.financial_institution_code}
                      >
                        {institution.financial_institution_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="user_type"
            render={({ field, fieldState }) => (
              <Field>
                <FieldContent data-invalid={fieldState.invalid}>
                  <FieldLabel>Tipo de persona</FieldLabel>
                </FieldContent>

                <Select
                  disabled={isLoadingFinancialInstitutions}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un tipo de persona" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectItem value="0">Natural</SelectItem>
                    <SelectItem value="1">Jurídica</SelectItem>
                  </SelectContent>
                </Select>

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <Controller
              control={form.control}
              name="user_legal_id_type"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldContent data-invalid={fieldState.invalid}>
                    <FieldLabel>Tipo de documento</FieldLabel>
                  </FieldContent>

                  <Select
                    disabled={isLoadingFinancialInstitutions}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="CC/NIT" />
                    </SelectTrigger>
                    <SelectContent position="item-aligned">
                      <SelectItem value="CC">CC</SelectItem>
                      <SelectItem value="NIT">NIT</SelectItem>
                    </SelectContent>
                  </Select>

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="user_legal_id"
              render={({ field, fieldState }) => (
                <Field className="col-span-2" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="document-id">
                    Número de documento
                  </FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id="document-id"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <PaymentConsent publicKey={publicKey} />

          <SubmitButton
            disabled={form.formState.isSubmitting}
            form="pse-payment-form"
            isSubmitting={form.formState.isSubmitting}
          >
            Ir al portal PSE
          </SubmitButton>
        </FieldGroup>
      </form>
    </Form>
  )
}
