import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { Image } from '@unpic/react'
import { RefreshCwIcon, TagIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  type ProductVariantResponse,
  updateProductVariant,
} from '@/api/products'
import { SubmitButton } from '@/components/submit-button'
import { Badge } from '@/components/ui/badge'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { UpdateProductVariantSchema } from '@/schemas/product'
import { getImageUrl } from '@/shared/cdn'

type Props = {
  variant: ProductVariantResponse
  productId: string
}

export function UpdateProductVariantForm({
  variant,
  productId,
}: Readonly<Props>) {
  const form = useForm({
    resolver: arktypeResolver(UpdateProductVariantSchema),
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
    mutationFn: updateProductVariant,
    onSuccess: async (data, __, ___, context) => {
      await context.client.invalidateQueries({
        queryKey: ['products', 'variant', productId],
      })

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

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex p-3">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <Badge className="text-xs" variant="outline">
                <TagIcon className="inline h-3 w-3" />
                {variant.sku}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {form.formState.isDirty && (
                <Badge
                  className="bg-warning-lighter text-warning-base"
                  variant="secondary"
                >
                  Modificado
                </Badge>
              )}

              {form.formState.isSubmitting && (
                <Badge variant="secondary">
                  <Spinner />
                  Actualizando...
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {variant.optionValues.map((value) => (
              <Badge key={value.id}>
                {value.optionTypeName}: {value.value}
              </Badge>
            ))}
          </div>

          <div className="mb-4 flex gap-2">
            {variant.images.map((image) => (
              <Image
                alt={image.altText}
                className="rounded-sm object-cover"
                height={96}
                key={image.id}
                layout="constrained"
                priority
                src={getImageUrl(image.imageUrl || 'placeholder.svg')}
                width={96}
              />
            ))}
          </div>

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
    </div>
  )
}
