import { api } from '@cetus/api-client'
import type {
  createProductVariantSchema,
  createSimpleProductSchema,
} from '@cetus/schemas/product.schema'
import type { FileWithPreview } from '@cetus/web/hooks/use-file-upload'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

type CreateSimpleProduct = typeof createSimpleProductSchema.infer
type CreateProductVariant = typeof createProductVariantSchema.infer

export async function uploadProductImages(
  values: CreateSimpleProduct | CreateProductVariant,
  images: FileWithPreview[],
) {
  const filestoUpload = values.images
    .map(async (image) => {
      const file = images.find((img) => img.id === image.id)

      if (!file) {
        return null
      }

      if (file.file instanceof File) {
        const { url } = await api.aws.generateSignedUrl({
          fileName: image.imageUrl,
        })

        const response = await fetch(url, {
          method: 'PUT',
          body: file.file,
        })

        return response
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
      return api.products.createSimple(values)
    },
    onSuccess: () => {
      toast.success('Producto creado correctamente')
      navigate({
        to: '/app/products',
      })
    },
  })
}
