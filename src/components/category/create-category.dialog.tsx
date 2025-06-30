import { createCategory, CreateCategoryRequest } from '@/api/categories'
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
import { useOrganization } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { type TypeOf, z } from 'zod'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const createCategorySchema = z.object({
  name: z.string(),
})

type FormValues = TypeOf<typeof createCategorySchema>

export const CreateCategoryDialog = ({ open, onOpenChange }: Props) => {
  const org = useOrganization()
  const form = useForm<FormValues>({
    resolver: zodResolver(createCategorySchema),
  })

  const createCategoryMutation = useMutation({
    mutationKey: ['categories', 'create'],
    mutationFn: (category: CreateCategoryRequest) =>
      createCategory(category, org.organization?.slug ?? undefined),
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
