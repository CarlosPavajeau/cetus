import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { Image } from '@unpic/react'
import { RefreshCwIcon, TagIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  type ProductVariantResponse,
  updateProductVariant,
} from '@/api/products'
import { SubmitButton } from '@/components/submit-button'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { UpdateProductVariantSchema } from '@/schemas/product'
import { getImageUrl } from '@/shared/cdn'

type Props = {
  variant: ProductVariantResponse
  productId: string
}

export function UpdateProductVariantForm({ variant, productId }: Props) {
  const form = useForm({
    resolver: arktypeResolver(UpdateProductVariantSchema),
    defaultValues: {
      id: variant.id,
      stock: variant.stock,
      price: variant.price,
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

            {form.formState.isDirty && (
              <Badge
                className="bg-warning-lighter text-warning-base"
                variant="secondary"
              >
                Modificado
              </Badge>
            )}
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

          <Form {...form}>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
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
              </div>

              <div className="flex justify-between">
                <div />

                <SubmitButton
                  disabled={form.formState.isSubmitting}
                  isSubmitting={form.formState.isSubmitting}
                  type="submit"
                >
                  <div className="flex items-center gap-2">
                    Actualizar
                    <RefreshCwIcon className="h-4 w-4" />
                  </div>
                </SubmitButton>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
