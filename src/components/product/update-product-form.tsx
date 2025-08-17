import type { Product } from '@/api/products'
import { CategorySelector } from '@/components/category/category-selector'
import { ProductImagesManager } from '@/components/product/product-images-manager'
import { SubmitButton } from '@/components/submit-button'
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
import type { FileWithPreview } from '@/hooks/use-file-upload'
import { type UpdateProduct, UpdateProductSchema } from '@/schemas/product'
import { generateImageUrl } from '@/shared/images'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  product: Product
}

export function UpdateProductForm({ product }: Props) {
  const form = useForm({
    resolver: arktypeResolver(UpdateProductSchema),
    defaultValues: {
      ...product,
      images: product.images.map((image) => ({
        id: image.id.toString(),
        imageUrl: image.imageUrl,
        sortOrder: image.sortOrder,
      })),
    } satisfies UpdateProduct,
  })

  const [newProductImages, setNewProductImages] = useState<FileWithPreview[]>(
    [],
  )
  const existingImages = product.images

  const handleFilesChange = (files: FileWithPreview[]) => {
    const shouldGenerateImageUrl = (file: FileWithPreview) => {
      const existingImage = existingImages.find(
        (image) => image.imageUrl === file.id,
      )
      return !existingImage
    }

    const formImages = files.map((file, index) => {
      if (shouldGenerateImageUrl(file)) {
        return {
          id: file.id,
          imageUrl: generateImageUrl(file),
          sortOrder: index,
        }
      }

      const existingImage = existingImages.find(
        (image) => image.imageUrl === file.id,
      )

      return {
        id: file.id,
        imageUrl: existingImage?.imageUrl ?? '',
        sortOrder: index,
      }
    })

    form.setValue('images', formImages)
    setNewProductImages(files)
  }

  const updateProductMutation = useUpdateProduct(newProductImages)
  const handleSubmit = form.handleSubmit((values) =>
    updateProductMutation.mutate(values),
  )

  return (
    <Form {...form}>
      <form
        className="grid flex-1 auto-rows-min gap-6 px-4"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4">
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
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <div>
                    <div className="inline-flex items-center gap-2">
                      <Switch
                        aria-label="Toggle switch"
                        checked={field.value ?? false}
                        id={field.name}
                        onCheckedChange={field.onChange}
                      />
                      <FormLabel className="font-medium text-sm">
                        {field.value ? 'Activo' : 'Inactivo'}
                      </FormLabel>
                    </div>
                  </div>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="images"
            render={() => (
              <ProductImagesManager
                existingImages={existingImages}
                onFilesChange={handleFilesChange}
              />
            )}
          />
        </div>

        <SubmitButton
          className="w-full"
          disabled={updateProductMutation.isPending}
          isSubmitting={updateProductMutation.isPending}
          type="submit"
        >
          Actualizar
        </SubmitButton>
      </form>
    </Form>
  )
}
