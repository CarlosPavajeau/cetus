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
import { useCreateCategory } from '@cetus/features/categories/hooks/use-create-category'
import { createCategorySchema } from '@cetus/schemas/category.schema'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useForm } from 'react-hook-form'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateCategoryDialog = ({ open, onOpenChange }: Props) => {
  const form = useForm({
    resolver: arktypeResolver(createCategorySchema),
  })

  const createCategoryMutation = useCreateCategory()

  const onSubmit = form.handleSubmit((values) => {
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
        <DialogHeader>
          <DialogTitle className="sm:text-center">
            Agregar categoria
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
            <Button disabled={createCategoryMutation.isPending} type="submit">
              Agregar
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
