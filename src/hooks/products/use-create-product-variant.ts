import { createProductVariant } from '@/api/products'
import { uploadProductImages } from '@/hooks/products/use-create-simple-product'
import type { FileWithPreview } from '@/hooks/use-file-upload'
import type { CreateProductVariant } from '@/schemas/product'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useCreateProductVariant(images: FileWithPreview[]) {
  return useMutation({
    mutationKey: ['product', 'create', 'variant'],
    mutationFn: async (values: CreateProductVariant) => {
      await uploadProductImages(values, images)
      return createProductVariant(values)
    },
    onSuccess: () => {
      toast.success('Variante de producto creada correctamente')
    },
  })
}
