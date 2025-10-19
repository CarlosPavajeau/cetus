import { SelectValue } from '@radix-ui/react-select'
import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { useCities, useStates } from '@/hooks/use-state'
import type { CreateOrderFormValues } from '@/schemas/orders'

export function AddressFields() {
  const form = useFormContext<CreateOrderFormValues>()

  const { states, isLoading } = useStates()
  const [currentState, setCurrentState] = useState<string | undefined>()
  const { cities, isLoading: isLoadingCities } = useCities(currentState)

  const handleStateChange = (value: string) => {
    setCurrentState(value)
    form.resetField('cityId', { defaultValue: '' })
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="*:not-first:mt-2">
          <Label htmlFor="state">Departamento</Label>
          <Select
            disabled={isLoading || isLoadingCities}
            onValueChange={handleStateChange}
            value={currentState}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un departamento" />
            </SelectTrigger>
            <SelectContent>
              {states?.map((state) => (
                <SelectItem key={state.id} value={state.id}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FormField
          control={form.control}
          name="cityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad</FormLabel>
              <FormControl>
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
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-4">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}
