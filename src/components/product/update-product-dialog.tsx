import type { Product } from '@/api/products'
import { CategorySelector } from '@/components/category/category-selector'
import {
  ImageUploader,
  useImageUpload,
} from '@/components/product/image-uploader'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateProduct } from '@/hooks/products'
import {
  type UpdateProductFormValues,
  updateProductSchema,
} from '@/schemas/product'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  product: Product
}

export const UpdateProductDialog = ({ product }: Props) => {
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<UpdateProductFormValues>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: {
      ...product,
      description: product.description ?? undefined,
      imageUrl: product.imageUrl ?? '',
    },
  })

  const {
    mainImage,
    mainImageUrl,
    getRootProps,
    getInputProps,
    isDragActive,
    removeImage,
    hasImageChanged,
  } = useImageUpload(form, product.imageUrl)

  const updateProductMutation = useUpdateProduct(
    mainImage,
    hasImageChanged,
    () => {
      setIsOpen(false)
    },
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          aria-label="Edit product"
        >
          <span>Editar</span>
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sm:text-center">
            Actualizar producto
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit((values) =>
              updateProductMutation.mutate(values),
            )}
          >
            <div className="grid gap-4 md:grid-cols-2">
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
                        <Textarea {...field} value={field.value || ''} />
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
                </div>

                <CategorySelector />

                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="*:not-first:ml-2">
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

              <div>
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={() => (
                    <FormItem>
                      <ImageUploader
                        form={form}
                        mainImage={mainImage}
                        mainImageUrl={mainImageUrl}
                        getRootProps={getRootProps}
                        getInputProps={getInputProps}
                        isDragActive={isDragActive}
                        removeImage={removeImage}
                      />
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
              {updateProductMutation.isPending
                ? 'Actualizando...'
                : 'Actualizar'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
