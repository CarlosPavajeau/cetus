import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { Order } from '@/api/orders'
import { SubmitButton } from '@/components/submit-button'
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
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
import { useMerchant } from '@/hooks/wompi/use-merchant'
import { PaymentSchema } from '@/schemas/payments'

type Props = {
  order: Order
}

export const PsePaymentForm = ({ order }: Props) => {
  const form = useForm({
    resolver: arktypeResolver(PaymentSchema),
    defaultValues: {
      type: 'PSE',
      acceptance_token: '',
      presigned_acceptance: true,
      presigned_personal_data_auth: true,
    },
  })

  const { financialInstitutions, isLoading: isLoadingFinancialInstitutions } =
    useFinancialInstitutions('')

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

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                    <SelectItem value="CC">Cédula de ciudadanía</SelectItem>
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
      </FieldGroup>

      <div className="pt-6">
        <SubmitButton
          disabled={form.formState.isSubmitting}
          form="pse-payment-form"
          isSubmitting={form.formState.isSubmitting}
        >
          Ir al portal PSE
        </SubmitButton>
      </div>
    </form>
  )
}
