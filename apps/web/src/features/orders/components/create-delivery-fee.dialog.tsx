import { api } from '@cetus/api-client'
import { createDeliveryFeeSchema } from '@cetus/schemas/order.schema'
import { Button } from '@cetus/ui/button'
import DialogContent, {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@cetus/ui/dialog'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@cetus/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import { SubmitButton } from '@cetus/web/components/submit-button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@cetus/web/components/ui/field'
import { useStates } from '@cetus/web/features/states/hooks/use-state'
import { useStateCities } from '@cetus/web/features/states/hooks/use-state-cities'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

export function CreateDeliveryFeeDialog() {
  const [open, setOpen] = useState(false)
  const [currentState, setCurrentState] = useState<string | undefined>(
    undefined,
  )

  const { data: states, isLoading: isLoadingStates } = useStates()
  const { data: cities, isLoading: isLoadingCities } =
    useStateCities(currentState)

  const form = useForm({
    resolver: arktypeResolver(createDeliveryFeeSchema),
    defaultValues: {
      cityId: '',
      fee: 0,
    },
  })

  const handleStateChange = (value: string) => {
    setCurrentState(value)
    form.resetField('cityId', { defaultValue: '' })
  }

  const queryClient = useQueryClient()
  const createDeliveryFeeMutation = useMutation({
    mutationKey: ['delivery-fees', 'create'],
    mutationFn: api.orders.deliveryFees.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['delivery-fees'],
      })

      setOpen(false)
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    createDeliveryFeeMutation.mutate(values)
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger>
        <Button>Agregar costo de envío</Button>
      </DialogTrigger>
      <DialogContent>
        <form id="create-delivery-fee-form" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Agregar costo de envío</DialogTitle>
            <DialogDescription>
              Complete el siguiente formulario para agregar un nuevo costo de
              envío.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <FieldGroup>
              <Field>
                <FieldLabel>Departamento</FieldLabel>

                <Select
                  disabled={isLoadingStates || isLoadingCities}
                  onValueChange={handleStateChange}
                  value={currentState as string}
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
              </Field>

              <Controller
                control={form.control}
                name="cityId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="cityId">Ciudad</FieldLabel>

                    <Select
                      disabled={
                        isLoadingCities || !currentState || isLoadingStates
                      }
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

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="fee"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fee">Costo de envío</FieldLabel>

                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        className="tabular-nums"
                        id="price"
                        {...field}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>COP</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>

            <SubmitButton
              disabled={createDeliveryFeeMutation.isPending}
              isSubmitting={createDeliveryFeeMutation.isPending}
              type="submit"
            >
              Agregar
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
