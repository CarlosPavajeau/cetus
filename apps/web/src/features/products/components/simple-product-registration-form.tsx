import { createSimpleProductSchema } from '@cetus/schemas/product.schema'
import { generateImageName } from '@cetus/shared/utils/image'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
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
import { Textarea } from '@cetus/ui/textarea'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { CategoryCombobox } from '@cetus/web/features/categories/components/category.combobox'
import { ProductImagesUploader } from '@cetus/web/features/products/components/product-images-uploader'
import { useCreateSimpleProduct } from '@cetus/web/features/products/hooks/use-create-simple-product'
import type { FileWithPreview } from '@cetus/web/hooks/use-file-upload'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { PackageIcon } from 'lucide-react'
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <PackageIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground">
              Información básica del producto
            </CardTitle>
            <CardDescription>
              Ingresa los detalles básicos sobre tu producto
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
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

              <CategoryCombobox />
            </div>

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input type="text" {...field} />
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

            <div className="grid gap-4 md:grid-cols-2">
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

            <FormField
              control={form.control}
              name="images"
              render={() => (
                <FormItem className="mt-4">
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

            <div className="flex justify-end pt-6">
              <SubmitButton
                disabled={form.formState.isSubmitting}
                isSubmitting={form.formState.isSubmitting}
              >
                Crear producto
              </SubmitButton>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
