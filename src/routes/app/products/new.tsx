import { CategorySelector } from '@/components/category/category-selector'
import { CreateCategoryDialog } from '@/components/category/create-category.dialog'
import { ProductImagesUploader } from '@/components/product/product-images-uploader'
import { ReturnButton } from '@/components/return-button'
import { SubmitButton } from '@/components/submit-button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateProduct } from '@/hooks/products'
import type { FileWithPreview } from '@/hooks/use-file-upload'
import { CreateProductSchema } from '@/schemas/product'
import { generateImageUrl } from '@/shared/images'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
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
      categoryId: '',
      images: [],
    },
  })

  const [productImages, setProductImages] = useState<FileWithPreview[]>([])

  const handleFilesChange = (files: FileWithPreview[]) => {
    setProductImages(files)

    const formImages = files.map((file, index) => ({
      id: file.id,
      imageUrl: generateImageUrl(file),
      sortOrder: index,
    }))

    form.setValue('images', formImages)
  }

  const createProductMutation = useCreateProduct(productImages)
  const handleSubmit = form.handleSubmit((values) => {
    createProductMutation.mutate(values)
  })

  const openCategoryDialog = () => {
    setIsCategoryDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading font-semibold text-2xl">Crear producto</h1>

      <ReturnButton />

      <Form {...form}>
        <form
          className="space-y-8 rounded-md border border-muted bg-card p-4 md:p-8"
          onSubmit={handleSubmit}
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
                            className="peer ps-6 pe-12"
                            type="number"
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
                          type="number"
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
                name="images"
                render={() => (
                  <FormItem>
                    <FormLabel>Imágenes</FormLabel>
                    <ProductImagesUploader onFilesChange={handleFilesChange} />

                    <FormDescription>
                      Las imágenes serán mostradas en el orden en que fueron
                      subidas. Tomando como imagen principal la primera imagen
                      subida.
                    </FormDescription>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <SubmitButton
              className="w-full md:w-auto"
              disabled={createProductMutation.isPending}
              isSubmitting={createProductMutation.isPending}
            >
              Crear producto
            </SubmitButton>
          </div>
        </form>
      </Form>

      <CreateCategoryDialog
        onOpenChange={setIsCategoryDialogOpen}
        open={isCategoryDialogOpen}
      />
    </div>
  )
}
