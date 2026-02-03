import { Button } from '@cetus/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@cetus/ui/dialog'
import { Field, FieldContent, FieldGroup, FieldLabel } from '@cetus/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import { useStates } from '@cetus/web/features/states/hooks/use-state'
import { useStateCities } from '@cetus/web/features/states/hooks/use-state-cities'
import { LocationUpdate01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'

type Props = {
  onSelectCity: (cityId: string) => void
}

export function UpdateSaleLocationDialog({ onSelectCity }: Props) {
  const { data: states, isLoading } = useStates()
  const [currentState, setCurrentState] = useState<string | undefined>()
  const { data: cities, isLoading: isLoadingCities } =
    useStateCities(currentState)
  const [selectedCity, setSelectedCity] = useState<string | undefined>()

  const handleSelectState = (stateId: string) => {
    setCurrentState(stateId)
    setSelectedCity(undefined)
  }

  const handleSelectCity = (cityId: string) => {
    setSelectedCity(cityId)
  }

  const handleSave = () => {
    if (selectedCity) {
      onSelectCity(selectedCity)
    }
  }

  const handleCancel = () => {
    setCurrentState(undefined)
    setSelectedCity(undefined)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="xs" type="button" variant="secondary">
          <HugeiconsIcon icon={LocationUpdate01Icon} />
          Cambiar ubicación
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar ubicación de la venta</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldContent>
              <FieldLabel>Departamento</FieldLabel>
            </FieldContent>

            <Select
              disabled={isLoading || isLoadingCities}
              onValueChange={handleSelectState}
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

          <Field>
            <FieldContent>
              <FieldLabel>Ciudad</FieldLabel>
            </FieldContent>

            <Select
              disabled={isLoading || isLoadingCities || !currentState}
              onValueChange={handleSelectCity}
              value={selectedCity}
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
        </FieldGroup>

        <DialogFooter>
          <DialogClose asChild>
            <Button onClick={handleCancel} variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button disabled={!selectedCity} onClick={handleSave} type="button">
              Guardar cambios
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
