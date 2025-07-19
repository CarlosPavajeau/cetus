import { CategorySelector } from '@/components/category/category-selector'
import { CreateCategoryDialog } from '@/components/category/create-category.dialog'
import {
  ImageUploader,
  useImageUpload,
} from '@/components/product/image-uploader'
import { ReturnButton } from '@/components/return-button'
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
import { CreateProductSchema } from '@/schemas/product'
import { useAppStore } from '@/store/app'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { createFileRoute } from '@tanstack/react-router'
import { Fragment, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'

export const Route = createFileRoute('/app/products/new')({
  component: ProductCreateForm,
})

function ProductCreateForm() {
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const form = useForm({
    resolver: arktypeResolver(CreateProductSchema),
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

  const { currentStore } = useAppStore()
  const createProductMutation = useCreateProduct(mainImage, currentStore?.slug)

  const openCategoryDialog = useCallback(() => {
    setIsCategoryDialogOpen(true)
  }, [])

  return (
    <Fragment>
      <div className="space-y-4">
        <h1 className="font-heading font-semibold text-2xl">Crear producto</h1>

        <ReturnButton />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              createProductMutation.mutate(values),
            )}
            className="space-y-8 rounded-md border border-muted bg-card p-4 md:p-8"
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
    </Fragment>
  )
}
