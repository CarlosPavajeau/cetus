import { uploadFileToS3 } from '@/api/aws'
import { createSimpleProduct } from '@/api/products'
import type { FileWithPreview } from '@/hooks/use-file-upload'
import type { CreateSimpleProduct } from '@/schemas/product'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

async function uploadProductImages(
  values: CreateSimpleProduct,
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
