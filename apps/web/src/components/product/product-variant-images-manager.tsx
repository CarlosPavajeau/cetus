import { Image } from '@unpic/react'
import { GripVerticalIcon } from 'lucide-react'
import { useImperativeHandle, useState } from 'react'
import { orderProductVariantImages, type ProductImage } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable'
import { getImageUrl } from '@/shared/cdn'

export type ProductVariantImagesManagerHandle = {
  process: () => Promise<void>
}

type Props = {
  initialImages?: ProductImage[]
  ref?: React.Ref<ProductVariantImagesManagerHandle>
  variantId: number
}

export function ProductVariantImagesManager({
  initialImages,
  ref,
  variantId,
}: Props) {
  const [images, setImages] = useState<ProductImage[]>(initialImages || [])
  const [hasImagesChanged, setHasImagesChanged] = useState(false)

  useImperativeHandle(ref, () => ({
    process: async () => {
      if (hasImagesChanged) {
        await orderProductVariantImages({
          variantId,
          images,
        })
        setHasImagesChanged(false)
      }
    },
  }))

  const handleImagesChange = (newImagesIds: number[]) => {
    setHasImagesChanged(true)
    const newImages = newImagesIds
      .map((id, index) => {
        const existingImage = images.find((image) => image.id === id)
        if (existingImage) {
          return {
            ...existingImage,
            sortOrder: index,
          } satisfies ProductImage
        }
        return null
      })
      .filter((image) => image !== null)

    setImages(newImages)
  }

  return (
    <Field>
      <FieldLabel className="flex items-center">Imágenes</FieldLabel>

      <Sortable
        className="flex flex-wrap gap-2.5"
        getItemValue={(item) => item.toString()}
        onValueChange={handleImagesChange}
        strategy="grid"
        value={images.map((img) => img.id)}
      >
        {images.map((img) => (
          <SortableItem key={img.id} value={img.id.toString()}>
            <div className="group relative flex shrink-0 items-center justify-center rounded-md border border-border bg-accent/50 shadow-none transition-all duration-200 hover:z-10 hover:bg-accent/70 data-[dragging=true]:z-50">
              <Image
                alt={img.altText}
                className="pointer-events-none h-[120px] w-full rounded-md object-cover"
                height={120}
                key={img.id}
                layout="constrained"
                priority
                src={getImageUrl(img.imageUrl || 'placeholder.svg')}
                width={120}
              />

              <SortableItemHandle className="absolute start-2 top-2 cursor-grab opacity-0 active:cursor-grabbing group-hover:opacity-100">
                <Button
                  className="size-6 rounded-full"
                  size="icon"
                  variant="outline"
                >
                  <GripVerticalIcon className="size-3.5" />
                </Button>
              </SortableItemHandle>
            </div>
          </SortableItem>
        ))}
      </Sortable>
    </Field>
  )
}
