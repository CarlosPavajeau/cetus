import { type CreateCategoryRequest, createCategory } from '@/api/categories'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useAppStore } from '@/store/app'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type } from 'arktype'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CreateCategorySchema = type({
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre debe tener más de 1 carácter',
  }),
})

type CreateCategory = typeof CreateCategorySchema.infer

export const CreateCategoryDialog = ({ open, onOpenChange }: Props) => {
  const { currentStore } = useAppStore()
  const form = useForm<CreateCategory>({
    resolver: arktypeResolver(CreateCategorySchema),
  })

  const createCategoryMutation = useMutation({
    mutationKey: ['categories', 'create'],
    mutationFn: (category: CreateCategoryRequest) =>
      createCategory(category, currentStore?.slug),
  })

  const onSubmit = form.handleSubmit((values) => {
    createCategoryMutation.mutate(values)
  })

  const queryClient = useQueryClient()
  useEffect(() => {
    if (createCategoryMutation.isSuccess) {
      form.reset({
        name: '',
      })

      queryClient.invalidateQueries({
        queryKey: ['categories'],
      })

      onOpenChange(false)
    }
  }, [createCategoryMutation.isSuccess, form, onOpenChange, queryClient])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="sm:text-center">
            Agregar categoria
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
            <Button type="submit" disabled={createCategoryMutation.isPending}>
              Agregar
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
