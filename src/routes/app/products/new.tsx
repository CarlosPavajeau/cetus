import { AccessDenied } from '@/components/access-denied'
import { CategorySelector } from '@/components/category/category-selector'
import { CreateCategoryDialog } from '@/components/category/create-category.dialog'
import {
  ImageUploader,
  useImageUpload,
} from '@/components/product/image-uploader'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateProduct } from '@/hooks/products'
import {
  type CreateProductFormValues,
  createProductSchema,
} from '@/schemas/product'
import { Protect } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'

export const Route = createFileRoute('/app/products/new')({
  component: ProductCreateForm,
})

function ProductCreateForm() {
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const form = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      stock: 0,
      imageUrl: '',
      categoryId: '',
    },
  })

  const {
    mainImage,
    mainImageUrl,
    getRootProps,
    getInputProps,
    isDragActive,
    removeImage,
  } = useImageUpload(form)

  const createProductMutation = useCreateProduct(mainImage)

  const openCategoryDialog = useCallback(() => {
    setIsCategoryDialogOpen(true)
  }, [])

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-bold font-heading text-2xl text-foreground">
            Crear producto
          </h1>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              createProductMutation.mutate(values),
            )}
            className="space-y-8"
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
                        <Input placeholder="Nombre del producto" {...field} />
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
                        <Textarea
                          placeholder="Descripción del producto"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              className="peer ps-6 pe-12"
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
                            type="number"
                            className="tabular-nums"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <CategorySelector onSelectCreateCategory={openCategoryDialog} />
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

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={createProductMutation.isPending}
                className="w-full md:w-auto"
              >
                {createProductMutation.isPending
                  ? 'Creando...'
                  : 'Crear producto'}
              </Button>
            </div>
          </form>
        </Form>

        <CreateCategoryDialog
          open={isCategoryDialogOpen}
          onOpenChange={setIsCategoryDialogOpen}
        />
      </div>
    </Protect>
  )
}
