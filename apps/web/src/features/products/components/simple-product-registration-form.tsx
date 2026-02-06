import { createSimpleProductSchema } from '@cetus/schemas/product.schema'
import { generateImageName } from '@cetus/shared/utils/image'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@cetus/ui/field'
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
import { Controller, FormProvider, useForm } from 'react-hook-form'
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
    <FormProvider {...form}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <FieldGroup>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Nombre</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  autoFocus
                  placeholder="Ej: Camiseta deportiva"
                  type="text"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <CategoryCombobox />

          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Descripción</FieldLabel>
                <Textarea
                  {...field}
                  aria-invalid={fieldState.invalid}
                  placeholder="Describe brevemente tu producto..."
                  value={field.value || ''}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup>
            <Controller
              control={form.control}
              name="price"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Precio</FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      className="peer ps-6 pe-12"
                      inputMode="decimal"
                      placeholder="0"
                      type="text"
                    />
                    <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground text-sm peer-disabled:opacity-50">
                      $
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-muted-foreground text-sm peer-disabled:opacity-50">
                      COP
                    </span>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <FieldGroup>
            <Controller
              control={form.control}
              name="stock"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Stock</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    className="tabular-nums"
                    inputMode="numeric"
                    placeholder="0"
                    type="text"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Controller
            control={form.control}
            name="sku"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-muted-foreground">SKU</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  className="text-muted-foreground"
                  type="text"
                />
                <FieldDescription>
                  Generado automáticamente a partir del nombre
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <Separator />

        <FieldGroup>
          <Controller
            control={form.control}
            name="images"
            render={({ fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <ProductImagesUploader onFilesChange={handleFilesChange} />

                <FieldDescription>
                  La primera imagen será la imagen principal del producto.
                </FieldDescription>

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

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
    </FormProvider>
  )
}
