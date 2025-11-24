import { api } from '@cetus/api-client'
import type {
  ProductVariantResponse,
  UpdateProductVariant,
} from '@cetus/api-client/types/products'
import { updateProductVariantSchema } from '@cetus/schemas/product.schema'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@cetus/ui/input-group'
import { Switch } from '@cetus/ui/switch'
import { SubmitButton } from '@cetus/web/components/submit-button'
import {
  ProductVariantImagesManager,
  type ProductVariantImagesManagerHandle,
} from '@cetus/web/features/products/components/product-variant-images-manager'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { RefreshCwIcon } from 'lucide-react'
import { useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type Props = {
  variant: ProductVariantResponse
}

export function UpdateProductVariantForm({ variant }: Readonly<Props>) {
  const form = useForm({
    resolver: arktypeResolver(updateProductVariantSchema),
    defaultValues: {
      id: variant.id,
      stock: variant.stock,
      price: variant.price,
      enabled: variant.enabled,
      featured: variant.featured,
    },
  })

  const { mutateAsync } = useMutation({
    mutationKey: ['products', 'variant', 'update', variant.id],
    mutationFn: (data: UpdateProductVariant) =>
      api.products.variants.update(variant.id, data),
    onSuccess: async (data) => {
      toast.success('Variante actualizada correctamente')

      form.reset({
        id: data.id,
        stock: data.stock,
        price: data.price,
        enabled: data.enabled,
        featured: data.featured,
      })
    },
  })

  const managerRef = useRef<ProductVariantImagesManagerHandle>(null)

  const handleSubmit = form.handleSubmit(async (data) => {
    await managerRef.current?.process()
    await mutateAsync(data)
  })

  return (
    <div>
      <div className="flex flex-1 flex-col gap-2">
        <ProductVariantImagesManager
          initialImages={variant.images}
          ref={managerRef}
          variantId={variant.id}
        />

        <form
          id={`update-product-variant-form-${variant.id}`}
          onSubmit={handleSubmit}
        >
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                control={form.control}
                name="price"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="price">Precio</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        className="tabular-nums"
                        id="price"
                        {...field}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>COP</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="stock"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="stock">Stock</FieldLabel>
                    <Input
                      className="tabular-nums"
                      id="stock"
                      placeholder="0.00"
                      type="text"
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="enabled"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="enabled">Estado</FieldLabel>
                  <div className="inline-flex items-center gap-2">
                    <Switch
                      aria-invalid={fieldState.invalid}
                      checked={field.value}
                      id="enabled"
                      name={field.name}
                      onCheckedChange={field.onChange}
                    />
                    <FieldDescription>
                      {field.value ? 'Activo' : 'Inactivo'}
                    </FieldDescription>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="featured"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="featured">Destacado</FieldLabel>
                  <div className="inline-flex items-center gap-2">
                    <Switch
                      aria-invalid={fieldState.invalid}
                      checked={field.value}
                      id="featured"
                      name={field.name}
                      onCheckedChange={field.onChange}
                    />
                    <FieldDescription>
                      {field.value ? 'Destacado' : 'No destacado'}
                    </FieldDescription>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <SubmitButton
              disabled={form.formState.isSubmitting}
              form={`update-product-variant-form-${variant.id}`}
              isSubmitting={form.formState.isSubmitting}
              type="submit"
            >
              <div className="flex items-center gap-2">
                Actualizar
                <RefreshCwIcon className="h-4 w-4" />
              </div>
            </SubmitButton>
          </FieldGroup>
        </form>
      </div>
    </div>
  )
}
