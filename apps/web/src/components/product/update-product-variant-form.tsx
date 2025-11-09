import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { Image } from '@unpic/react'
import { GripVerticalIcon, RefreshCwIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  orderProductVariantImages,
  type ProductImage,
  type ProductVariantResponse,
  updateProductVariant,
} from '@/api/products'
import { SubmitButton } from '@/components/submit-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable'
import { Switch } from '@/components/ui/switch'
import { UpdateProductVariantSchema } from '@/schemas/product'
import { getImageUrl } from '@/shared/cdn'

type Props = {
  variant: ProductVariantResponse
}

export function UpdateProductVariantForm({ variant }: Readonly<Props>) {
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

  const [images, setImages] = useState(variant.images || [])
  const [hasImagesChanged, setHasImagesChanged] = useState(false)

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data)

    if (hasImagesChanged) {
      await orderProductVariantImages({
        variantId: variant.id,
        images,
      })
      setHasImagesChanged(false)
    }
  })

  const handleImagesChange = (newImagesIds: number[]) => {
    setHasImagesChanged(true)
    const newImages = newImagesIds
      .map((id, index) => {
        const existingImage = images.find((image) => image.id === id)
        if (existingImage) {
          return {
            ...existingImage,
            sortOrder: index,
          } satisfies ProductImage
        }
        return null
      })
      .filter((image) => image !== null)

    setImages(newImages)
  }

  return (
    <div>
      <div className="flex flex-1 flex-col gap-2">
        <Field>
          <FieldLabel>Opciones</FieldLabel>
          <div className="flex items-center gap-2">
            {variant.optionValues.map((value) => (
              <Badge key={value.id}>
                {value.optionTypeName}: {value.value}
              </Badge>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel>Imágenes</FieldLabel>

          <Sortable
            className="flex flex-wrap gap-2.5"
            getItemValue={(item) => item.toString()}
            onValueChange={handleImagesChange}
            strategy="grid"
            value={images.map((img) => img.id)}
          >
            {images.map((img) => (
              <SortableItem key={img.id} value={img.id.toString()}>
                <div className="group relative flex shrink-0 items-center justify-center rounded-md border border-border bg-accent/50 shadow-none transition-all duration-200 hover:z-10 hover:bg-accent/70 data-[dragging=true]:z-50">
                  <Image
                    alt={img.altText}
                    className="pointer-events-none h-[120px] w-full rounded-md object-cover"
                    height={120}
                    key={img.id}
                    layout="constrained"
                    priority
                    src={getImageUrl(img.imageUrl || 'placeholder.svg')}
                    width={120}
                  />

                  <SortableItemHandle className="absolute start-2 top-2 cursor-grab opacity-0 active:cursor-grabbing group-hover:opacity-100">
                    <Button
                      className="size-6 rounded-full"
                      size="icon"
                      variant="outline"
                    >
                      <GripVerticalIcon className="size-3.5" />
                    </Button>
                  </SortableItemHandle>
                </div>
              </SortableItem>
            ))}
          </Sortable>
        </Field>

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
