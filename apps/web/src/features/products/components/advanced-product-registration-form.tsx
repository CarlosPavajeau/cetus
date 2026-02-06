import { api } from '@cetus/api-client'
import type {
  CreateProductVariant,
  ProductOptionType,
} from '@cetus/api-client/types/products'
import { createProductSchema } from '@cetus/schemas/product.schema'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import { Label } from '@cetus/ui/label'
import { Textarea } from '@cetus/ui/textarea'
import { Currency } from '@cetus/web/components/currency'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { CategoryCombobox } from '@cetus/web/features/categories/components/category.combobox'
import { ProductVariantRegistrationSheet } from '@cetus/web/features/products/components/product-variant-registration-sheet'
import { useAdvancedProductRegistrationStore } from '@cetus/web/store/products/advance-product-registration-store'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  PackageIcon,
  PlusIcon,
  SettingsIcon,
  TagIcon,
  Trash2Icon,
} from 'lucide-react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { productQueries } from '../queries'

export function AdvancedProductRegistrationForm() {
  const { step } = useAdvancedProductRegistrationStore()

  return (
    <div className="space-y-2">
      {step === 1 && <BasicProductInformationStep />}

      {step === 2 && <ProductOptionsStep />}

      {step === 3 && <ProductVariantsStep />}
    </div>
  )
}

function BasicProductInformationStep() {
  const { nextStep, setProductId } = useAdvancedProductRegistrationStore()

  const form = useForm({
    resolver: arktypeResolver(createProductSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationKey: ['products', 'create'],
    mutationFn: api.products.create,
    onSuccess: (data) => {
      setProductId(data.id)
      nextStep()
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    mutate(data)
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

        <div className="pt-2">
          <SubmitButton
            className="w-full md:ml-auto md:flex md:w-auto"
            disabled={isPending}
            isSubmitting={isPending}
            size="lg"
          >
            <span className="flex items-center gap-2">
              Siguiente: Configurar opciones
              <SettingsIcon className="h-4 w-4" />
            </span>
          </SubmitButton>
        </div>
      </form>
    </FormProvider>
  )
}

function ProductOptionsStep() {
  const {
    selectedOptions,
    productId,
    addProductOption,
    removeProductOption,
    nextStep,
  } = useAdvancedProductRegistrationStore()

  const { data, isLoading } = useQuery(productQueries.optionTypes.list())

  const handleAddOption = (option: ProductOptionType) => {
    addProductOption(option)
  }

  const handleRemoveOption = (option: ProductOptionType) => {
    removeProductOption(option)
  }

  const createAllProductOptions = () => {
    const createPromises = selectedOptions.map((option) =>
      api.products.options.create({
        productId,
        optionTypeId: option.id,
      }),
    )

    return Promise.all(createPromises)
  }

  const { mutate, isPending } = useMutation({
    mutationKey: ['products', 'options', 'create'],
    mutationFn: createAllProductOptions,
    onSuccess: () => {
      nextStep()
    },
  })

  const handleSubmit = () => {
    mutate()
  }

  return (
    <div className="space-y-6">
      {isLoading && <DefaultLoader />}

      {!isLoading && data && (
        <div className="flex flex-col gap-3">
          <Label className="font-medium text-sm">Opciones disponibles</Label>
          <div className="flex flex-wrap gap-2">
            {data.map((option) => (
              <Button
                className="text-xs"
                disabled={selectedOptions.some((o) => o.id === option.id)}
                key={option.id}
                onClick={() => handleAddOption(option)}
                size="sm"
                variant="outline"
              >
                <PlusIcon className="h-3 w-3" />
                {option.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {selectedOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm">
            Opciones seleccionadas ({selectedOptions.length})
          </Label>

          {selectedOptions.map((option) => (
            <div
              className="overflow-hidden rounded-md border bg-card"
              key={option.id}
            >
              <div className="flex p-3">
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex justify-between">
                    <h3 className="line-clamp-1 font-medium text-sm">
                      {option.name}
                    </h3>

                    <button
                      aria-label={`Quitar la opción ${option.name}`}
                      className="text-muted-foreground hover:text-red-500"
                      onClick={() => handleRemoveOption(option)}
                      type="button"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {option.values.map((value) => (
                      <Badge key={value.id} variant="secondary">
                        {value.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOptions.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          <SettingsIcon className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p className="text-sm">Aún no se han añadido opciones</p>
          <p className="text-xs">
            Agrega opciones como tamaño, color o sabor para crear variantes de
            producto
          </p>
        </div>
      )}

      <div className="pt-2">
        <SubmitButton
          className="w-full md:ml-auto md:flex md:w-auto"
          disabled={selectedOptions.length === 0 || isPending}
          isSubmitting={isPending}
          onClick={handleSubmit}
          size="lg"
        >
          Siguiente: Configurar variantes
        </SubmitButton>
      </div>
    </div>
  )
}

function ProductVariantsStep() {
  const { selectedOptions, reset, variants } =
    useAdvancedProductRegistrationStore()

  const generateVariantName = (variant: CreateProductVariant) => {
    const optionValues = selectedOptions
      .map((option) => {
        const value = option.values.find((v) =>
          variant.optionValueIds.includes(v.id),
        )
        return value ? value.value : null
      })
      .filter((v) => v !== null)

    return optionValues.join(' / ')
  }

  const getOptionValueName = (valueId: number) => {
    for (const option of selectedOptions) {
      const value = option.values.find((v) => v.id === valueId)
      if (value) {
        return `${option.name}: ${value.value}`
      }
    }
    return null
  }

  const handleCompleteRegistration = () => {
    reset()
  }

  return (
    <div className="space-y-6">
      {variants.length === 0 && (
        <div className="py-8 text-center">
          <PackageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mb-2 font-medium">No se han creado variantes aún</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Genera variantes automáticamente a partir de tus opciones o créalas
            manualmente
          </p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <ProductVariantRegistrationSheet />
          </div>
        </div>
      )}

      {variants.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-md bg-muted/50 p-4">
            <div className="flex-1" />
            <ProductVariantRegistrationSheet />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-sm">
                Variantes ({variants.length})
              </Label>
            </div>

            {variants.map((variant) => (
              <div
                className="overflow-hidden rounded-md border bg-card"
                key={variant.sku}
              >
                <div className="flex p-3">
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="line-clamp-1 font-medium text-sm">
                          {generateVariantName(variant)}
                        </h3>

                        <Badge className="text-xs" variant="outline">
                          <TagIcon className="inline h-3 w-3" />
                          {variant.sku}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {variant.optionValueIds.map((value) => (
                        <Badge key={value} variant="secondary">
                          {getOptionValueName(value)}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-muted-foreground text-sm">
                        Stock:{' '}
                        <span className="text-foreground">{variant.stock}</span>
                      </span>

                      <span className="text-muted-foreground text-sm">
                        Precio:{' '}
                        <span className="text-foreground">
                          <Currency currency="COP" value={variant.price} />
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="pt-2">
        <Button
          className="w-full md:ml-auto md:flex md:w-auto"
          disabled={variants.length === 0}
          onClick={handleCompleteRegistration}
          size="lg"
        >
          Completar registro
        </Button>
      </div>
    </div>
  )
}
