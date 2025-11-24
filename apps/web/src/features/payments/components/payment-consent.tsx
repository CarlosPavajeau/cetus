import { wompi } from '@cetus/integrations-wompi'
import { Checkbox } from '@cetus/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

type Props = {
  publicKey: string
  hideConsent?: boolean
}

export const PaymentConsent = ({ publicKey, hideConsent = false }: Props) => {
  const { data: merchant } = useQuery({
    queryKey: ['merchant', publicKey],
    queryFn: () => wompi.merchants.get(publicKey),
    staleTime: 300_000, // 5 minutes
  })
  const form = useFormContext()

  useEffect(() => {
    if (merchant?.data?.presigned_acceptance?.acceptance_token) {
      form.setValue(
        'acceptance_token',
        merchant.data.presigned_acceptance.acceptance_token,
        { shouldValidate: true },
      )
    }
  }, [merchant, form])

  if (!merchant) {
    return null
  }

  if (hideConsent) {
    return null
  }

  return (
    <FieldGroup data-slot="checkbox-group">
      <Controller
        control={form.control}
        name="presigned_acceptance"
        render={({ field, fieldState }) => (
          <Field>
            <Field data-invalid={fieldState.invalid} orientation="horizontal">
              <Checkbox
                checked={field.value}
                id="presigned-acceptance"
                name={field.name}
                onCheckedChange={field.onChange}
              />

              <FieldLabel htmlFor="presigned-acceptance">
                Acepto haber leído{' '}
                <a
                  className="text-foreground underline"
                  href={merchant.data.presigned_acceptance.permalink}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  los reglamentos
                </a>{' '}
                para hacer este pago
              </FieldLabel>
            </Field>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="presigned_personal_data_auth"
        render={({ field, fieldState }) => (
          <Field>
            <Field data-invalid={fieldState.invalid} orientation="horizontal">
              <Checkbox
                checked={field.value}
                id="presigned-personal-data-auth"
                name={field.name}
                onCheckedChange={field.onChange}
              />

              <FieldLabel htmlFor="presigned-personal-data-auth">
                Acepto la{' '}
                <a
                  className="text-foreground underline"
                  href={merchant.data.presigned_personal_data_auth.permalink}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  autorización para la administración de datos personales
                </a>
              </FieldLabel>
            </Field>

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  )
}
