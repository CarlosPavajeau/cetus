import { arktypeResolver } from '@hookform/resolvers/arktype'
import { ArrowLeftIcon, PackageIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { v7 as uuid } from 'uuid'
import { CategorySelector } from '@/components/category/category-selector'
import { ProductImagesUploader } from '@/components/product/product-images-uploader'
import { SubmitButton } from '@/components/submit-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useCreateSimpleProduct } from '@/hooks/products/use-create-simple-product'
import type { FileWithPreview } from '@/hooks/use-file-upload'
import { CreateSimpleProductSchema } from '@/schemas/product'
import { generateImageUrl } from '@/shared/images'

type Props = {
  onBack: () => void
}

export function SimpleProductRegistrationForm({ onBack }: Readonly<Props>) {
  const form = useForm({
    resolver: arktypeResolver(CreateSimpleProductSchema),
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
    <div>
      <div className="flex items-center justify-between space-y-2">
        <Button onClick={onBack} size="sm" variant="ghost">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <Badge className="ml-auto" variant="secondary">
          Paso 1 de 1
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-3">
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

                    <CategorySelector />
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
                      <FormItem>
                        <FormLabel>Imágenes</FormLabel>
                        <ProductImagesUploader
                          onFilesChange={handleFilesChange}
                        />

                        <FormDescription>
                          Las imágenes serán mostradas en el orden en que fueron
                          subidas. Tomando como imagen principal la primera
                          imagen subida.
                        </FormDescription>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between pt-6">
                    <div />

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
        </div>
      </div>
    </div>
  )
}
