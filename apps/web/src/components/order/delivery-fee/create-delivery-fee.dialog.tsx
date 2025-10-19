import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type } from 'arktype'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { createDeliveryFee } from '@/api/orders'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
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
  SelectValue,
} from '@/components/ui/select'
import { useCities, useStates } from '@/hooks/use-state'

const CreateDeliveryFeeSchema = type({
  cityId: type.string.moreThanLength(1).configure({
    message: 'Seleccione una ciudad',
  }),
  fee: type.number.moreThan(0).configure({
    message: 'El costo de envío debe ser mayor a 0',
  }),
})

export function CreateDeliveryFeeDialog() {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="ml-auto">
          <PlusIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
          Agregar costo de envío
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar costo de envío</DialogTitle>
          <DialogDescription>En construcción.</DialogDescription>
        </DialogHeader>

        <CreateDeliveryFeeForm onSuccess={close} />
      </DialogContent>
    </Dialog>
  )
}

type CreateDeliveryFeeFormProps = {
  onSuccess?: () => void
}

function CreateDeliveryFeeForm({
  onSuccess,
}: Readonly<CreateDeliveryFeeFormProps>) {
  const { states, isLoading } = useStates()
  const [currentState, setCurrentState] = useState<string | undefined>(
    undefined,
  )
  const { cities, isLoading: isLoadingCities } = useCities(currentState)

  const form = useForm({
    resolver: arktypeResolver(CreateDeliveryFeeSchema),
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
    mutationFn: createDeliveryFee,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['delivery-fees'],
      })
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    createDeliveryFeeMutation.mutate({
      cityId: values.cityId,
      fee: values.fee,
    })
  })

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="*:not-first:mt-2">
          <Label htmlFor="state">Departamento</Label>
          <Select
            disabled={isLoading || isLoadingCities}
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

        <FormField
          control={form.control}
          name="fee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Costo de envío</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          className="w-full"
          disabled={createDeliveryFeeMutation.isPending}
          type="submit"
        >
          Agregar
        </Button>
      </form>
    </Form>
  )
}
