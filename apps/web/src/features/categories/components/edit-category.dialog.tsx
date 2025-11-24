import { api } from '@cetus/api-client'
import type {
  Category,
  UpdateCategoryRequest,
} from '@cetus/api-client/types/categories'
import { editCategorySchema } from '@cetus/schemas/category.schema'
import { Button } from '@cetus/ui/button'
import DialogContent, {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@cetus/ui/dialog'
import { DropdownMenuItem } from '@cetus/ui/dropdown-menu'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

type Props = {
  category: Category
}

export function EditCategoryDialog({ category }: Props) {
  const [open, setOpen] = useState(false)
  const form = useForm({
    resolver: arktypeResolver(editCategorySchema),
    defaultValues: {
      id: category.id,
      name: category.name,
    },
  })

  const queryClient = useQueryClient()
  const updateCategoryMutation = useMutation({
    mutationKey: ['categories', 'update', category.id],
    mutationFn: (data: UpdateCategoryRequest) =>
      api.categories.update(category.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categories'],
      })

      setOpen(false)
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    updateCategoryMutation.mutate(values)
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onClick={() => setOpen(true)}
          onSelect={(e) => e.preventDefault()}
        >
          Editar
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent>
        <form id="edit-category-form" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
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
              disabled={updateCategoryMutation.isPending}
              isSubmitting={updateCategoryMutation.isPending}
              type="submit"
            >
              Actualizar
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
