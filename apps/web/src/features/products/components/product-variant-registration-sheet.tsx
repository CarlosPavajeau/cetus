import { createProductVariantSchema } from '@cetus/schemas/product.schema'
import { generateImageName } from '@cetus/shared/utils/image'
import { Button } from '@cetus/ui/button'
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
import type { FileWithPreview } from '@cetus/web/hooks/use-file-upload'
import { useAdvancedProductRegistrationStore } from '@cetus/web/store/products/advance-product-registration-store'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { PlusIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { v7 as uuid } from 'uuid'

export function ProductVariantRegistrationSheet() {
  const { selectedOptions, productId, variants, addVariant } =
    useAdvancedProductRegistrationStore()
  const [open, setOpen] = useState(false)

  const form = useForm({
    resolver: arktypeResolver(createProductVariantSchema),
    defaultValues: {
      productId,
      optionValueIds: [],
      images: [],
    },
  })

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

  const usedVariantCombinations = useMemo(
    () =>
      variants.map((variant) =>
        variant.optionValueIds
          .map((id) => Number(id))
          .sort((a, b) => a - b)
          .join('-'),
      ),
    [variants],
  )

  const currentValues = form.watch('optionValueIds')
  const canUseOptionValue = useCallback(
    (valueId: number) => {
      const parsedCurrentValues = currentValues.map((id) => Number(id))

      const potentialCombination = [...parsedCurrentValues, valueId]
        .sort((a, b) => a - b)
        .join('-')

      const usedCombinations = new Set(usedVariantCombinations)

      return !usedCombinations.has(potentialCombination)
    },
    [currentValues, usedVariantCombinations],
  )

  const skuId = useMemo(() => uuid(), [currentValues])

  const generateVariantSku = (values: number[]) => {
    const optionNames = selectedOptions
      .map((opt) => opt.name.toLocaleLowerCase())
      .join('-')

    return `${productId.slice(0, 4)}-${optionNames}-${values.join('-')}-${skuId.slice(-8)}`
  }

  const onSelectOptionValue = (optionId: number) => (optionValueId: string) => {
    const option = selectedOptions.find((opt) => opt.id === optionId)
    if (!option) {
      return
    }

    // Remove the previously selected value for current option
    const filterValues = currentValues.filter(
      (id) => !option.values.some((v) => v.id === Number(id)),
    )

    const newValues = [...filterValues, Number(optionValueId)]

    form.setValue('optionValueIds', newValues)

    const variantSku = generateVariantSku(newValues.map((id) => Number(id)))
    form.setValue('sku', variantSku)
  }

  const { mutateAsync } = useCreateProductVariant(variantImages)

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(values)

    form.reset({
      productId,
      optionValueIds: [],
      images: [],
    })

    addVariant(values)
    setOpen(false)
  })

  const handleOnOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({
        productId,
        optionValueIds: [],
        images: [],
      })
    }
    setOpen(isOpen)
  }

  return (
    <Sheet onOpenChange={handleOnOpenChange} open={open}>
      <SheetTrigger asChild>
        <Button>
          <PlusIcon className="h-4 w-4" />
          Agregar variante
        </Button>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Agregar variante del producto</SheetTitle>
          <SheetDescription>
            Selecciona las opciones de la variante que deseas agregar.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <Form {...form}>
            <form
              className="grid flex-1 auto-rows-min gap-3"
              onSubmit={handleSubmit}
            >
              {selectedOptions.map((option) => (
                <div className="*:not-first:mt-2" key={option.id}>
                  <Label>{option.name}</Label>

                  <Select
                    key={option.id}
                    onValueChange={onSelectOptionValue(option.id)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      {option.values.map((value) => (
                        <SelectItem
                          disabled={!canUseOptionValue(value.id)}
                          key={value.id}
                          value={String(value.id)}
                        >
                          {value.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

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

              <FormField
                control={form.control}
                name="images"
                render={() => (
                  <FormItem>
                    <FormLabel>Imágenes</FormLabel>
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

              <div className="flex justify-between pt-6">
                <div />
                <SubmitButton
                  disabled={form.formState.isSubmitting}
                  isSubmitting={form.formState.isSubmitting}
                >
                  Agregar variante
                </SubmitButton>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
