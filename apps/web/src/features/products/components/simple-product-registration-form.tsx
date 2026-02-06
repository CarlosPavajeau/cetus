import { createSimpleProductSchema } from '@cetus/schemas/product.schema'
import { generateImageName } from '@cetus/shared/utils/image'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cetus/ui/form'
import { Input } from '@cetus/ui/input'
import { Separator } from '@cetus/ui/separator'
import { Textarea } from '@cetus/ui/textarea'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { CategoryCombobox } from '@cetus/web/features/categories/components/category.combobox'
import { ProductImagesUploader } from '@cetus/web/features/products/components/product-images-uploader'
import { useCreateSimpleProduct } from '@cetus/web/features/products/hooks/use-create-simple-product'
import type { FileWithPreview } from '@cetus/web/hooks/use-file-upload'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { v7 as uuid } from 'uuid'

export function SimpleProductRegistrationForm() {
  const form = useForm({
    resolver: arktypeResolver(createSimpleProductSchema),
  })

  const [productImages, setProductImages] = useState<FileWithPreview[]>([])
  const handleFilesChange = (files: FileWithPreview[]) => {
    setProductImages(files)

    const formImages = files.map((file, index) => ({
      id: file.id,
      imageUrl: generateImageName(),
      sortOrder: index,
    }))

    form.setValue('images', formImages)
  }

  const productName = form.watch('name')
  const id = useMemo(() => uuid(), [])

  const generateProductSku = useCallback(() => {
    const baseSku =
      productName?.trim().replaceAll(/\s+/g, '-').toLowerCase() || ''
    return `${baseSku}-${id.slice(-4)}`
  }, [productName, id])

  useEffect(() => {
    if (productName) {
      const sku = generateProductSku()
      form.setValue('sku', sku)
    }
  }, [productName])

  const { mutateAsync } = useCreateSimpleProduct(productImages)

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(values)
  })

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input
                    autoFocus
                    placeholder="Ej: Camiseta deportiva"
                    type="text"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <CategoryCombobox />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe brevemente tu producto..."
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

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
                      inputMode="decimal"
                      placeholder="0"
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
                    inputMode="numeric"
                    placeholder="0"
                    type="text"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">SKU</FormLabel>
              <FormControl>
                <Input
                  className="text-muted-foreground"
                  type="text"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Generado automáticamente a partir del nombre
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <FormField
          control={form.control}
          name="images"
          render={() => (
            <FormItem>
              <ProductImagesUploader onFilesChange={handleFilesChange} />

              <FormDescription>
                La primera imagen será la imagen principal del producto.
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-2">
          <SubmitButton
            className="w-full md:ml-auto md:flex md:w-auto"
            disabled={form.formState.isSubmitting}
            isSubmitting={form.formState.isSubmitting}
            size="lg"
          >
            Crear producto
          </SubmitButton>
        </div>
      </form>
    </Form>
  )
}
