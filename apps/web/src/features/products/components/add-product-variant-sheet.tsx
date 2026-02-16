import type { Product } from '@cetus/api-client/types/products'
import { createProductVariantSchema } from '@cetus/schemas/product.schema'
import { generateImageName } from '@cetus/shared/utils/image'
import { Button } from '@cetus/ui/button'
import { Checkbox } from '@cetus/ui/checkbox'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@cetus/ui/drawer'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@cetus/ui/input-group'
import { Label } from '@cetus/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@cetus/ui/sheet'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { ProductImagesUploader } from '@cetus/web/features/products/components/product-images-uploader'
import { useCreateProductVariant } from '@cetus/web/features/products/hooks/use-create-product-variant'
import { productQueries } from '@cetus/web/features/products/queries'
import type { FileWithPreview } from '@cetus/web/hooks/use-file-upload'
import { useIsMobile } from '@cetus/web/hooks/use-mobile'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useQuery } from '@tanstack/react-query'
import { ChevronDownIcon, PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { v7 as uuid } from 'uuid'
import { ProfitabilitySection } from './profitability-section'

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

function AddProductVariantForm({
  product,
  onSuccess,
}: {
  product: Product
  onSuccess: () => void
}) {
  const [hasDiscount, setHasDiscount] = useState(false)
  const [showSku, setShowSku] = useState(false)

  const { data: productOptions } = useQuery(
    productQueries.options.list(product.id),
  )

  const options = useMemo(() => {
    if (!productOptions) {
      return []
    }

    return productOptions.flatMap((option) => option.optionType)
  }, [productOptions])

  const { data: variants } = useQuery(productQueries.variants.list(product.id))

  const form = useForm({
    resolver: arktypeResolver(createProductVariantSchema),
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

  const watchedCostPrice = form.watch('costPrice')
  const watchedPrice = form.watch('price')

  const [variantImages, setVariantImages] = useState<FileWithPreview[]>([])
  const handleFilesChange = (files: FileWithPreview[]) => {
    setVariantImages(files)

    const formImages = files.map((file, index) => ({
      id: file.id,
      imageUrl: generateImageName(),
      sortOrder: index,
    }))

    form.setValue('images', formImages)
  }

  const { mutateAsync } = useCreateProductVariant(variantImages)

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(values)
    onSuccess()
  })

  return (
    <form
      className="flex flex-1 flex-col overflow-hidden"
      id="add-product-variant-form"
      onSubmit={handleSubmit}
    >
      <FieldGroup className="flex-1 overflow-auto px-4">
        <FieldSet>
          <FieldLegend>Opciones</FieldLegend>
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
                          message: `Selecciona ${option.name}`,
                        },
                      ]}
                    />
                  )}
                </Field>
              )
            })}

            <div>
              <button
                className="flex w-full items-center gap-1.5 py-1 text-muted-foreground text-xs hover:text-foreground"
                onClick={() => setShowSku(!showSku)}
                type="button"
              >
                <ChevronDownIcon
                  className={`size-3 transition-transform ${showSku ? 'rotate-0' : '-rotate-90'}`}
                />
                SKU {form.watch('sku') ? `· ${form.watch('sku')}` : ''}
              </button>
              {showSku && (
                <div className="mt-2">
                  <Controller
                    control={form.control}
                    name="sku"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="sr-only" htmlFor="sku">
                          SKU
                        </FieldLabel>
                        <Input id="sku" type="text" {...field} />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                        <FieldDescription>
                          Se genera automáticamente. Puedes editarlo si lo
                          necesitas.
                        </FieldDescription>
                      </Field>
                    )}
                  />
                </div>
              )}
            </div>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Precios</FieldLegend>

          <FieldGroup>
            <Controller
              control={form.control}
              name="costPrice"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="costPrice">
                    Costo de adquisición
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      className="tabular-nums"
                      id="costPrice"
                      inputMode="numeric"
                      placeholder="0"
                      {...field}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>COP</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                  <FieldDescription>
                    Solo visible para ti. Sirve para calcular tu ganancia.
                  </FieldDescription>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="price"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="price">Precio de venta</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      className="tabular-nums"
                      id="price"
                      inputMode="numeric"
                      placeholder="0"
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

            <ProfitabilitySection
              costPrice={watchedCostPrice}
              price={watchedPrice}
            />

            <Field orientation="horizontal">
              <Checkbox
                checked={hasDiscount}
                id="has-discount"
                name="has-discount"
                onCheckedChange={(value) => setHasDiscount(value as boolean)}
              />
              <Label htmlFor="has-discount">
                Este producto tiene descuento
              </Label>
            </Field>

            {hasDiscount && (
              <Controller
                control={form.control}
                name="compareAtPrice"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="compareAtPrice">
                      Precio original
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        className="tabular-nums"
                        id="compareAtPrice"
                        inputMode="numeric"
                        placeholder="0"
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
            )}
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Inventario</FieldLegend>

          <FieldGroup>
            <Controller
              control={form.control}
              name="stock"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="stock">Stock disponible</FieldLabel>
                  <Input
                    id="stock"
                    inputMode="numeric"
                    placeholder="0"
                    type="text"
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Imágenes</FieldLegend>

          <Controller
            control={form.control}
            name="images"
            render={({ fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <ProductImagesUploader onFilesChange={handleFilesChange} />
                <FieldDescription>
                  La primera imagen será la imagen principal de la variante.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldSet>
      </FieldGroup>

      <div className="border-t bg-background p-4">
        <SubmitButton
          className="w-full"
          disabled={form.formState.isSubmitting}
          isSubmitting={form.formState.isSubmitting}
        >
          Agregar variante
        </SubmitButton>
      </div>
    </form>
  )
}

export function AddProductVariantSheet({ product }: Props) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  const { isLoading: optionsLoading } = useQuery(
    productQueries.options.list(product.id),
  )
  const { isLoading: variantsLoading } = useQuery(
    productQueries.variants.list(product.id),
  )

  const handleOnOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
  }

  const handleSuccess = () => {
    setOpen(false)
  }

  const triggerButton = (
    <Button disabled={optionsLoading || variantsLoading}>
      <PlusIcon className="size-4" />
      Agregar variante
    </Button>
  )

  const title = 'Nueva variante'
  const description = `Configurá una nueva variante para ${product.name}`

  if (isMobile) {
    return (
      <Drawer onOpenChange={handleOnOpenChange} open={open}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <AddProductVariantForm onSuccess={handleSuccess} product={product} />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet onOpenChange={handleOnOpenChange} open={open}>
      <SheetTrigger asChild>{triggerButton}</SheetTrigger>
      <SheetContent className="flex flex-col md:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <AddProductVariantForm onSuccess={handleSuccess} product={product} />
      </SheetContent>
    </Sheet>
  )
}
