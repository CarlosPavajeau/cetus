import { type Product, updateProduct } from '@/api/products'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SquarePenIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { type TypeOf, z } from 'zod'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'

type Props = {
  product: Product
}

const updateProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.coerce.number(),
  stock: z.coerce.number(),
  enabled: z.boolean().default(true),
})

type FormValues = TypeOf<typeof updateProductSchema>

export const UpdateProductDialog = ({ product }: Props) => {
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: {
      ...product,
      description: product.description ?? undefined,
    },
  })

  const updateProductMutation = useMutation({
    mutationKey: ['products', 'update'],
    mutationFn: updateProduct,
  })

  const onSubmit = form.handleSubmit((values) => {
    updateProductMutation.mutate(values)
  })

  const queryClient = useQueryClient()
  useEffect(() => {
    if (updateProductMutation.isSuccess) {
      setIsOpen(false)
      queryClient.invalidateQueries({
        queryKey: ['products'],
      })
    }
  }, [updateProductMutation.isSuccess, queryClient])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="shadow-none"
          aria-label="Edit product"
        >
          <SquarePenIcon size={16} aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="sm:text-center">
            Actualizar producto
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            className="peer ps-6 pe-12"
                            placeholder="0.00"
                            type="text"
                            {...field}
                          />
                          <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground text-sm peer-disabled:opacity-50">
                            $
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-muted-foreground text-sm peer-disabled:opacity-50">
                            COP
                          </span>
                        </div>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input
                          className="tabular-nums"
                          placeholder="0.00"
                          type="text"
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <div
                          className="group inline-flex items-center gap-2"
                          data-state={field.value ? 'checked' : 'unchecked'}
                        >
                          <span
                            id={`${field.name}-off`}
                            className="flex-1 cursor-pointer text-right text-sm group-data-[state=checked]:text-muted-foreground/70"
                            aria-controls={field.name}
                            onClick={() => field.onChange(false)}
                          >
                            Inactivo
                          </span>
                          <Switch
                            id={field.name}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-labelledby={`${field.name}-off ${field.name}-on`}
                          />
                          <span
                            id={`${field.name}-on`}
                            className="flex-1 cursor-pointer text-left text-sm group-data-[state=unchecked]:text-muted-foreground/70"
                            aria-controls={field.name}
                            onClick={() => field.onChange(true)}
                          >
                            Activo
                          </span>
                        </div>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={updateProductMutation.isPending}
            >
              Actualizar
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
