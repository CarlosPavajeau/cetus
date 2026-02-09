import type { CreateOrder } from '@cetus/api-client/types/orders'
import type { City, State } from '@cetus/api-client/types/states'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@cetus/ui/combobox'
import { Field, FieldContent, FieldError, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import { useStates } from '@cetus/web/features/states/hooks/use-state'
import { useStateCities } from '@cetus/web/features/states/hooks/use-state-cities'
import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

export function AddressFields() {
  const form = useFormContext<CreateOrder>()

  const { data: states, isLoading } = useStates()
  const [currentState, setCurrentState] = useState<State | null>(null)
  const { data: cities, isLoading: isLoadingCities } = useStateCities(
    currentState?.id,
  )

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

              <Combobox
                autoHighlight
                disabled={isLoading || isLoadingCities}
                items={states ?? []}
                itemToStringLabel={(state: State) => state.name}
                itemToStringValue={(state: State) => state.id}
                onValueChange={(state: State | null) => {
                  setCurrentState(state)
                  form.resetField('shipping.cityId', { defaultValue: '' })
                }}
                value={currentState}
              >
                <ComboboxInput
                  disabled={isLoading || isLoadingCities}
                  placeholder="Buscar departamento..."
                  showClear
                />
                <ComboboxContent>
                  <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                  <ComboboxList>
                    {(state: State) => (
                      <ComboboxItem key={state.id} value={state}>
                        {state.name}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="shipping.cityId"
          render={({ field, fieldState }) => {
            const selectedCity =
              cities?.find((c) => c.id === field.value) ?? null

            return (
              <Field>
                <FieldContent data-invalid={fieldState.invalid}>
                  <FieldLabel>Ciudad</FieldLabel>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldContent>

                <Combobox
                  autoHighlight
                  disabled={isLoading || isLoadingCities || !currentState}
                  items={cities ?? []}
                  itemToStringLabel={(city: City) => city.name}
                  itemToStringValue={(city: City) => city.id}
                  onValueChange={(city: City | null) => {
                    field.onChange(city?.id ?? '')
                  }}
                  value={selectedCity}
                >
                  <ComboboxInput
                    disabled={isLoading || isLoadingCities || !currentState}
                    placeholder="Buscar ciudad..."
                    showClear
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                    <ComboboxList>
                      {(city: City) => (
                        <ComboboxItem key={city.id} value={city}>
                          {city.name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
            )
          }}
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
