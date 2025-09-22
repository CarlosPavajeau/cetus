import { ProductImagesUploader } from '@/components/product/product-images-uploader'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
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
import {
  type CreateProductVariant,
  CreateProductVariantSchema,
} from '@/schemas/product'
import { generateImageUrl } from '@/shared/images'
import { useAdvancedProductRegistrationStore } from '@/store/products/advance-product-registration-store'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  onSuccess: (createdVariant: CreateProductVariant) => void
}

export function ProductVariantRegistrationSheet({ onSuccess }: Props) {
  const { selectedOptions, productId } = useAdvancedProductRegistrationStore()
  const [open, setOpen] = useState(false)

  const form = useForm({
    resolver: arktypeResolver(CreateProductVariantSchema),
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
      imageUrl: generateImageUrl(file),
      sortOrder: index,
    }))

    form.setValue('images', formImages)
  }

  const onSelectOptionValue = (optionId: string) => {
    const optionValues = form.getValues('optionValueIds')
    form.setValue('optionValueIds', [...optionValues, Number(optionId)])
  }

  const { mutateAsync } = useCreateProductVariant(variantImages)

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(values)

    form.reset({
      productId,
      optionValueIds: [],
      images: [],
    })

    setOpen(false)
    onSuccess(values)
  })

  return (
    <Sheet onOpenChange={setOpen} open={open}>
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

                  <Select key={option.id} onValueChange={onSelectOptionValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      {option.values.map((value) => (
                        <SelectItem key={value.id} value={String(value.id)}>
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
                name="stockQuantity"
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
