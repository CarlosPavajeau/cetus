import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { v7 as uuid } from 'uuid'
import {
  fetchProductOptions,
  fetchProductVariants,
  type Product,
} from '@/api/products'
import { ProductImagesUploader } from '@/components/product/product-images-uploader'
import { SubmitButton } from '@/components/submit-button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useCreateProductVariant } from '@/hooks/products/use-create-product-variant'
import type { FileWithPreview } from '@/hooks/use-file-upload'
import { CreateProductVariantSchema } from '@/schemas/product'
import { generateImageUrl } from '@/shared/images'

const generateSKU = (
  productName: string,
  options: Record<string, string>,
): string => {
  const MaxProductNameChars = 4
  const normalizedName = productName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, MaxProductNameChars)

  const optionParts = Object.entries(options)
    .map(([key, value]) => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '')
      const normalizedValue = value.toLowerCase().replace(/[^a-z0-9]/g, '')
      return `${normalizedKey}-${normalizedValue}`
    })
    .join('-')

  const MaxFinalPartLength = 8
  const finalPart = uuid().slice(-MaxFinalPartLength)

  return optionParts
    ? `${normalizedName}-${optionParts}-${finalPart}`
    : `${normalizedName}-${finalPart}`
}

type Props = {
  product: Product
}

export function AddProductVariantSheet({ product }: Props) {
  const [open, setOpen] = useState(false)

  const { isLoading: optionsLoading, data: productOptions } = useQuery({
    queryKey: ['products', 'options', product.id],
    queryFn: () => fetchProductOptions(product.id),
  })

  const options = useMemo(() => {
    if (!productOptions) {
      return []
    }

    return productOptions.flatMap((option) => option.optionType)
  }, [productOptions])

  const { isLoading: variantsLoading, data: variants } = useQuery({
    queryKey: ['products', 'variant', product.id],
    queryFn: () => fetchProductVariants(product.id),
  })

  const form = useForm({
    resolver: arktypeResolver(CreateProductVariantSchema),
    defaultValues: {
      productId: product.id,
      optionValueIds: [],
      images: [],
    },
  })

  const [selectedOptions, setSelectedOptions] = useState<
    Record<number, number>
  >({})

  const getDisabledValues = useMemo(() => {
    if (!(variants && options)) {
      return () => new Set<number>()
    }

    return (optionId: number) => {
      const disabledValues = new Set<number>()
      const currentOption = options.find((opt) => opt.id === optionId)

      if (!currentOption) {
        return disabledValues
      }

      const otherSelections = Object.entries(selectedOptions).filter(
        ([key]) => Number(key) !== optionId,
      )

      if (otherSelections.length === 0) {
        return disabledValues
      }

      for (const value of currentOption.values.map((val) => val.id)) {
        const hypotheticalVariant = {
          ...selectedOptions,
          [optionId]: value,
        }

        // Check if this combination already exists in variants
        const isDuplicate = variants.some((variant) =>
          Object.entries(hypotheticalVariant).every(([__, val]) =>
            variant.optionValues.map((v) => v.id).includes(val),
          ),
        )

        if (isDuplicate) {
          disabledValues.add(value)
        }
      }

      return disabledValues
    }
  }, [variants, options, selectedOptions])

  const onSelectOptionValue = (optionId: number) => (optionValueId: string) => {
    const newSelectedOptions = {
      ...selectedOptions,
      [optionId]: Number(optionValueId),
    }
    setSelectedOptions(newSelectedOptions)

    const optionValueIds = Object.values(newSelectedOptions)
    form.setValue('optionValueIds', optionValueIds, {
      shouldValidate: true,
      shouldDirty: true,
    })

    const optionNames = Object.entries(newSelectedOptions).reduce(
      (acc, [key, value]) => {
        const option = options.find((o) => o.id === Number(key))
        if (option) {
          const valueName =
            option.values.find((v) => v.id === value)?.value || ''
          acc[option.name] = valueName
        }
        return acc
      },
      {} as Record<string, string>,
    )

    const sku = generateSKU(product.id, optionNames)
    form.setValue('sku', sku, {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  useEffect(() => {
    if (options.length > 0) {
      form.register('optionValueIds', {
        validate: (value) => {
          if (!value || value.length !== options.length) {
            return 'Debes seleccionar una opción para cada tipo de variante'
          }
          return true
        },
      })
    }
  }, [options, form])

  const handleOnOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({
        productId: product.id,
        optionValueIds: [],
        images: [],
      })
      setSelectedOptions({})
      setVariantImages([])
    }
    setOpen(isOpen)
  }

  const [variantImages, setVariantImages] = useState<FileWithPreview[]>([])
  const handleFilesChange = (files: FileWithPreview[]) => {
    setVariantImages(files)

    const formImages = files.map((file, index) => ({
      id: file.id,
      imageUrl: generateImageUrl(file),
      sortOrder: index,
    }))

    form.setValue('images', formImages)
  }

  const { mutateAsync } = useCreateProductVariant(variantImages)

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(values)
    handleOnOpenChange(false)
  })

  return (
    <Sheet onOpenChange={handleOnOpenChange} open={open}>
      <SheetTrigger asChild>
        <Button disabled={optionsLoading || variantsLoading}>
          <PlusIcon className="h-4 w-4" />
          Agregar variante
        </Button>
      </SheetTrigger>

      <SheetContent className="md:max-w-xl">
        <SheetHeader>
          <SheetTitle>Agregar variante del producto</SheetTitle>
          <SheetDescription>
            Funcionalidad en construcción. Aún no disponible.
          </SheetDescription>
        </SheetHeader>

        <div className="overflow-auto px-4">
          <form id="add-product-variant-form" onSubmit={handleSubmit}>
            <FieldGroup>
              {options?.map((option) => {
                const disabledValues = getDisabledValues(option.id)
                const isSelected = selectedOptions[option.id] !== undefined
                const hasError = form.formState.isSubmitted && !isSelected

                return (
                  <Field data-invalid={hasError} key={option.id}>
                    <FieldLabel htmlFor={`option-${option.id}`}>
                      {option.name}
                    </FieldLabel>

                    <Select
                      onValueChange={onSelectOptionValue(option.id)}
                      value={
                        selectedOptions[option.id]
                          ? String(selectedOptions[option.id])
                          : undefined
                      }
                    >
                      <SelectTrigger id={`option-${option.id}`}>
                        <SelectValue placeholder="Selecciona una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        {option.values.map((value) => {
                          const isDisabled = disabledValues.has(value.id)

                          return (
                            <SelectItem
                              disabled={isDisabled}
                              key={value.id}
                              value={String(value.id)}
                            >
                              {value.value}
                              {isDisabled && (
                                <span className="ml-2 text-muted-foreground text-xs">
                                  (Ya existe)
                                </span>
                              )}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {hasError && (
                      <FieldError
                        errors={[
                          {
                            message: `Debes seleccionar una opción para ${option.name}`,
                          },
                        ]}
                      />
                    )}
                  </Field>
                )
              })}

              <Controller
                control={form.control}
                name="sku"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="sku">SKU</FieldLabel>
                    <Input id="sku" type="text" {...field} />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

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
                    <Input id="stock" type="text" {...field} />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="images"
                render={({ fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="images">Imágenes</FieldLabel>
                    <ProductImagesUploader onFilesChange={handleFilesChange} />
                    <FieldDescription>
                      Las imágenes serán mostradas en el orden en que fueron
                      subidas. Tomando como imagen principal la primera imagen
                      subida.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <SubmitButton
                disabled={form.formState.isSubmitting}
                isSubmitting={form.formState.isSubmitting}
              >
                Agregar variante
              </SubmitButton>
            </FieldGroup>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
