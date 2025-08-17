import type { ProductImage } from '@/api/products'
import { ProductImagesUploader } from '@/components/product/product-images-uploader'
import { FormDescription, FormItem, FormLabel } from '@/components/ui/form'
import type { FileMetadata, FileWithPreview } from '@/hooks/use-file-upload'
import { getImageUrl } from '@/shared/cdn'

type Props = {
  existingImages: ProductImage[]
  onFilesChange: (files: FileWithPreview[]) => void
}

export function ProductImagesManager({ existingImages, onFilesChange }: Props) {
  const initialFiles = existingImages.map(
    (image) =>
      ({
        name: image.imageUrl,
        size: 0,
        type: 'image/jpeg',
        url: getImageUrl(image.imageUrl),
        id: image.imageUrl,
      }) satisfies FileMetadata,
  )
  return (
    <FormItem>
      <FormLabel>Imágenes del producto</FormLabel>

      <ProductImagesUploader
        initialFiles={initialFiles}
        onFilesChange={onFilesChange}
      />

      <FormDescription>
        {existingImages.length > 0
          ? 'Puedes eliminar imágenes existentes y agregar nuevas. Las imágenes se mostrarán en el orden indicado.'
          : 'Las imágenes serán mostradas en el orden en que fueron subidas. La primera imagen será la imagen principal.'}
      </FormDescription>
    </FormItem>
  )
}
