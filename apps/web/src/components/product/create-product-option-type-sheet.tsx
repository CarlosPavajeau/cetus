import { arktypeResolver } from '@hookform/resolvers/arktype'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { createProductOptionType } from '@/api/products'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CreateProductOptionTypeSchema } from '@/schemas/product'

const createProductOptionTypeMutation = mutationOptions({
  mutationKey: ['product-option-types'],
  mutationFn: createProductOptionType,
})

type Props = {
  onSuccess: () => void
}

export function CreateProductOptionTypeSheet({ onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const form = useForm({
    resolver: arktypeResolver(CreateProductOptionTypeSchema),
    defaultValues: {
      values: [],
    },
  })

  const { mutateAsync } = useMutation(createProductOptionTypeMutation)

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(values, {
      onSuccess,
    })
    form.reset()
    setOpen(false)
  })

  const [newValue, setNewValue] = useState<string>('')

  const normalizeValue = (value: string) => value.trim()

  const handleAddValue = (value: string) => {
    if (!value || value.length === 0) {
      return
    }

    const normalizedValue = normalizeValue(value)

    if (normalizedValue.length === 0) {
      return
    }

    if (form.getValues('values').includes(normalizedValue)) {
      return
    }

    form.setValue('values', [...form.getValues('values'), normalizedValue])
    setNewValue('')
  }

  const handleRemoveValue = (value: string) => {
    if (!value || value.length === 0) {
      return
    }

    const normalizedValue = normalizeValue(value)

    if (normalizedValue.length === 0) {
      return
    }

    form.setValue(
      'values',
      form.getValues('values').filter((v: string) => v !== normalizedValue),
    )
  }

  const optionValues = form.watch('values')

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button>Agregar opción de producto</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Agregar opción de producto</SheetTitle>
          <SheetDescription>
            Agrega una nueva opción de producto.
          </SheetDescription>
        </SheetHeader>

        <div>
          <Form {...form}>
            <form
              className="grid flex-1 auto-rows-min gap-6 px-4"
              onSubmit={handleSubmit}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input autoFocus type="text" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="*:not-first:mt-2">
                <Label>Valor</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Nuevo valor"
                    type="text"
                    value={newValue}
                  />
                  <Button
                    disabled={form.formState.isSubmitting}
                    onClick={() => handleAddValue(newValue)}
                    type="button"
                    variant="outline"
                  >
                    Agregar
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-base">Valores</Label>
                <div className="flex flex-col gap-2">
                  {optionValues?.map((value) => (
                    <div
                      className="flex items-center justify-between rounded border px-2 py-1"
                      key={value}
                    >
                      <span className="text-sm">{value}</span>
                      <button
                        className="text-muted-foreground hover:text-red-500"
                        onClick={() => handleRemoveValue(value)}
                        type="button"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <SubmitButton
                disabled={form.formState.isSubmitting}
                isSubmitting={form.formState.isSubmitting}
              >
                Crear opción de producto
              </SubmitButton>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
