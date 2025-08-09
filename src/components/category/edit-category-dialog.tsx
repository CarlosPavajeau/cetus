import {
  type Category,
  type UpdateCategoryRequest,
  updateCategory,
} from '@/api/categories'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type } from 'arktype'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  category: Category
}

const EditCategorySchema = type({
  id: 'string',
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre debe tener más de 1 carácter',
  }),
})

export const EditCategoryDialog = ({ category }: Props) => {
  const [open, setOpen] = useState(false)

  const form = useForm({
    resolver: arktypeResolver(EditCategorySchema),
    defaultValues: {
      id: category.id,
      name: category.name,
    },
  })

  // Reset form values when category changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        id: category.id,
        name: category.name,
      })
    }
  }, [category, form, open])

  const updateCategoryMutation = useMutation({
    mutationKey: ['categories', 'update', category.id],
    mutationFn: (data: UpdateCategoryRequest) =>
      updateCategory(category.id, data),
  })

  const onSubmit = form.handleSubmit((values) => {
    updateCategoryMutation.mutate(values)
  })

  const queryClient = useQueryClient()
  useEffect(() => {
    if (updateCategoryMutation.isSuccess) {
      queryClient.invalidateQueries({
        queryKey: ['categories'],
      })

      setOpen(false)
    }
  }, [updateCategoryMutation.isSuccess, queryClient])

  return (
    <>
      <DropdownMenuItem
        onClick={() => setOpen(true)}
        onSelect={(e) => e.preventDefault()}
      >
        Editar
      </DropdownMenuItem>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sm:text-center">
              Editar categoría
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={onSubmit}>
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
              <Button disabled={updateCategoryMutation.isPending} type="submit">
                {updateCategoryMutation.isPending
                  ? 'Actualizando...'
                  : 'Actualizar'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
