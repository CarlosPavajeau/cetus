import { createCategorySchema } from '@cetus/schemas/category.schema'
import { Button } from '@cetus/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cetus/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import { SubmitButton } from '@cetus/web/components/submit-button'
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

          <div>
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
          </div>

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
