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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { type TypeOf, z } from 'zod'

type Props = {
  category: Category
}

const editCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'El nombre es requerido'),
})

type FormValues = TypeOf<typeof editCategorySchema>

export const EditCategoryDialog = ({ category }: Props) => {
  const [open, setOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(editCategorySchema),
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
        onSelect={(e) => e.preventDefault()}
        onClick={() => setOpen(true)}
      >
        Editar
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sm:text-center">
              Editar categoría
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input type="text" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={updateCategoryMutation.isPending}>
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
