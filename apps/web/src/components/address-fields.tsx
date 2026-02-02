import type { CreateOrder } from '@cetus/api-client/types/orders'
import { Field, FieldContent, FieldError, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import { useStates } from '@cetus/web/features/states/hooks/use-state'
import { useStateCities } from '@cetus/web/features/states/hooks/use-state-cities'
import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

export function AddressFields() {
  const form = useFormContext<CreateOrder>()

  const { data: states, isLoading } = useStates()
  const [currentState, setCurrentState] = useState<string | undefined>()
  const { data: cities, isLoading: isLoadingCities } =
    useStateCities(currentState)

  const handleStateChange = (value: string) => {
    setCurrentState(value)
    form.resetField('shipping.cityId', { defaultValue: '' })
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          control={form.control}
          name="shipping.cityId"
          render={({ fieldState }) => (
            <Field>
              <FieldContent data-invalid={fieldState.invalid}>
                <FieldLabel>Departamento</FieldLabel>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </FieldContent>

              <Select
                disabled={isLoading || isLoadingCities}
                onValueChange={handleStateChange}
                value={currentState}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un departamento" />
                </SelectTrigger>
                <SelectContent position="item-aligned">
                  {states?.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="shipping.cityId"
          render={({ field, fieldState }) => (
            <Field>
              <FieldContent data-invalid={fieldState.invalid}>
                <FieldLabel>Ciudad</FieldLabel>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </FieldContent>

              <Select
                disabled={isLoading || isLoadingCities || !currentState}
                onValueChange={field.onChange}
                value={field.value}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una ciudad" />
                </SelectTrigger>
                <SelectContent>
                  {cities?.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      </div>

      <Controller
        control={form.control}
        name="shipping.address"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="address">Dirección</FieldLabel>
            <Input {...field} aria-invalid={fieldState.invalid} id="address" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </>
  )
}
