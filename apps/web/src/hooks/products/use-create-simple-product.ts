import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { uploadFileToS3 } from '@/api/aws'
import { createSimpleProduct } from '@/api/products'
import type { FileWithPreview } from '@/hooks/use-file-upload'
import type {
  CreateProductVariant,
  CreateSimpleProduct,
} from '@/schemas/product'

export async function uploadProductImages(
  values: CreateSimpleProduct | CreateProductVariant,
  images: FileWithPreview[],
) {
  const filestoUpload = values.images
    .map((image) => {
      const file = images.find((img) => img.id === image.id)

      if (!file) {
        return null
      }

      if (file.file instanceof File) {
        return uploadFileToS3({
          fileName: image.imageUrl,
          file: file.file,
        })
      }

      return null
    })
    .filter(Boolean)

  await Promise.all(filestoUpload)
}

export function useCreateSimpleProduct(images: FileWithPreview[]) {
  const navigate = useNavigate()

  return useMutation({
    mutationKey: ['product', 'create', 'simple'],
    mutationFn: async (values: CreateSimpleProduct) => {
      await uploadProductImages(values, images)
      return createSimpleProduct(values)
    },
    onSuccess: () => {
      toast.success('Producto creado correctamente')
      navigate({
        to: '/app/products',
      })
    },
  })
}
