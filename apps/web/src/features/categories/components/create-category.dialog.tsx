import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createCategorySchema } from '@cetus/schemas/category.schema'
import { useCreateCategory } from '@cetus/web/features/categories/hooks/use-create-category'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { Controller, useForm } from 'react-hook-form'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateCategoryDialog = ({ open, onOpenChange }: Props) => {
  const form = useForm({
    resolver: arktypeResolver(createCategorySchema),
    defaultValues: {
      name: '',
    },
  })

  const createCategoryMutation = useCreateCategory()

  const handleSubmit = form.handleSubmit((values) => {
    createCategoryMutation.mutate(values, {
      onSuccess: () => {
        form.reset({
          name: '',
        })

        onOpenChange(false)
      },
    })
  })

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <form id="create-category-form" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Agregar categoría</DialogTitle>
            <DialogDescription>
              Complete el siguiente formulario para agregar una nueva categoría.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <FieldGroup>
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Nombre</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      id="name"
                    />

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
              disabled={createCategoryMutation.isPending}
              isSubmitting={createCategoryMutation.isPending}
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
