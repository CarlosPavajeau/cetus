import { api } from '@cetus/api-client'
import type { createProductVariantSchema } from '@cetus/schemas/product.schema'
import { uploadProductImages } from '@cetus/web/features/products/hooks/use-create-simple-product'
import type { FileWithPreview } from '@cetus/web/hooks/use-file-upload'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

type CreateProductVariant = typeof createProductVariantSchema.infer

export function useCreateProductVariant(images: FileWithPreview[]) {
  return useMutation({
    mutationKey: ['product', 'create', 'variant'],
    mutationFn: async (values: CreateProductVariant) => {
      await uploadProductImages(values, images)
      return api.products.variants.create(values)
    },
    onSuccess: (_, variables, __, context) => {
      toast.success('Variante de producto creada correctamente')
      context.client.invalidateQueries({
        queryKey: ['products', 'variant', variables.productId],
      })
    },
  })
}
