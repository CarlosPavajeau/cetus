import type { CreateOrder } from '@cetus/api-client/types/orders'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import { customerQueries } from '@cetus/web/features/customers/queries'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@uidotdev/usehooks'
import { useEffect, useRef } from 'react'
import { Controller, type useForm, useWatch } from 'react-hook-form'

const debounceDelay = 300

type CustomerInfoFieldsProps = {
  form: ReturnType<typeof useForm<CreateOrder>>
}

export function CustomerInfoFields({
  form,
}: Readonly<CustomerInfoFieldsProps>) {
  const phone = useWatch({ control: form.control, name: 'customer.phone' })
  const debouncedPhone = useDebounce(phone, debounceDelay)

  const { data: customer, isLoading } = useQuery(
    customerQueries.detailByPhone(debouncedPhone),
  )

  const prevCustomerRef = useRef(customer)
  useEffect(() => {
    if (isLoading || customer === prevCustomerRef.current) {
      return
    }
    prevCustomerRef.current = customer

    if (customer) {
      form.setValue('customer.name', customer.name)
      form.setValue('customer.email', customer.email)
      form.setValue('customer.documentNumber', customer.documentNumber)
    }
  }, [customer, form, isLoading])

  return (
    <FieldGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="customer.phone"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="customer-phone">Teléfono</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id="customer-phone"
                inputMode="tel"
                placeholder="300 123 4567"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="customer.email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="customer-email">
                Correo electrónico
                <span className="ml-1 font-normal text-muted-foreground text-xs">
                  (opcional)
                </span>
              </FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="email"
                id="customer-email"
                inputMode="email"
                placeholder="correo@ejemplo.com"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <Controller
        control={form.control}
        name="customer.name"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="customer-name">Nombre completo</FieldLabel>
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              autoComplete="name"
              id="customer-name"
              placeholder="Tu nombre y apellido"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="customer.documentNumber"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="customer-id">
              Identificación
              <span className="ml-1 font-normal text-muted-foreground text-xs">
                (opcional)
              </span>
            </FieldLabel>
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              autoComplete="off"
              id="customer-id"
              inputMode="numeric"
              placeholder="Número de documento"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  )
}
