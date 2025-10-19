import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  PackageIcon,
  PlusIcon,
  SettingsIcon,
  TagIcon,
  Trash2Icon,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import {
  createProduct,
  createProductOption,
  fetchProductOptionTypes,
  type ProductOptionType,
} from '@/api/products'
import { CategorySelector } from '@/components/category/category-selector'
import { Currency } from '@/components/currency'
import { DefaultLoader } from '@/components/default-loader'
import { ProductVariantRegistrationSheet } from '@/components/product/product-variant-registration-sheet'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  CreateProductSchema,
  type CreateProductVariant,
} from '@/schemas/product'
import { useAdvancedProductRegistrationStore } from '@/store/products/advance-product-registration-store'

type Props = {
  onBack: () => void
}

export function AdvancedProductRegistrationForm({ onBack }: Props) {
  const { step, reset } = useAdvancedProductRegistrationStore()
  const totalSteps = 3

  const handleBack = () => {
    reset()
    onBack()
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex items-center justify-between space-y-2">
        <Button onClick={handleBack} size="sm" variant="ghost">
          <ArrowLeftIcon className="h-4 w-4" />
          Volver
        </Button>

        <Badge className="ml-auto" variant="secondary">
          Paso {step} de {totalSteps}
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-3">
          {step === 1 && <BasicProductInformationStep />}

          {step === 2 && <ProductOptionsStep />}

          {step === 3 && <ProductVariantsStep />}
        </div>
      </div>
    </div>
  )
}

function BasicProductInformationStep() {
  const { nextStep, setProductId } = useAdvancedProductRegistrationStore()

  const form = useForm({
    resolver: arktypeResolver(CreateProductSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationKey: ['products', 'create'],
    mutationFn: createProduct,
    onSuccess: (data) => {
      setProductId(data.id)
      nextStep()
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    mutate(data)
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

              <CategorySelector />
            </div>

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

            <div className="flex justify-between pt-6">
              <div />

              <SubmitButton disabled={isPending} isSubmitting={isPending}>
                <div className="flex items-center gap-2">
                  Siguiente: Configurar opciones
                  <SettingsIcon className="h-4 w-4" />
                </div>
              </SubmitButton>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
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

  const { data, isLoading } = useQuery({
    queryKey: ['product-option-types'],
    queryFn: fetchProductOptionTypes,
  })

  const handleAddOption = (option: ProductOptionType) => {
    addProductOption(option)
  }

  const handleRemoveOption = (option: ProductOptionType) => {
    removeProductOption(option)
  }

  const createAllProductOptions = () => {
    const createPromises = selectedOptions.map((option) =>
      createProductOption({
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground">
              Opciones del producto
            </CardTitle>
            <CardDescription>
              Define las diferentes opciones disponibles para tu producto (por
              ejemplo, tamaño, color, sabor)
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
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

        <div className="flex justify-end">
          <SubmitButton
            disabled={selectedOptions.length === 0 || isPending}
            isSubmitting={isPending}
            onClick={handleSubmit}
          >
            Siguiente: Configurar variantes
          </SubmitButton>
        </div>
      </CardContent>
    </Card>
  )
}

function ProductVariantsStep() {
  const { selectedOptions, reset, variants } =
    useAdvancedProductRegistrationStore()

  const generateVariantName = (variant: CreateProductVariant) => {
    // Generate variant name based on selected option values
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <PackageIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground">
              Variantes del producto
            </CardTitle>
            <CardDescription>
              Cree variantes específicas según las opciones de su producto
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {variants.length === 0 && (
          <div className="py-8 text-center">
            <PackageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mb-2 font-medium">No se han creado variantes aún</h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Genera variantes automáticamente a partir de tus opciones o
              créalas manualmente
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
                          <span className="text-foreground">
                            {variant.stock}
                          </span>
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

        <div className="flex justify-end">
          <Button
            disabled={variants.length === 0}
            onClick={handleCompleteRegistration}
          >
            Completar registro
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
