import type { ProductImage } from '@cetus/api-client/types/products'
import { getImageUrl } from '@cetus/shared/utils/image'
import { cn } from '@cetus/web/shared/utils'
import { Image } from '@unpic/react'
import React from 'react'

type Props = {
  images: ProductImage[]
}

export function ProductImageGallery({ images }: Props) {
  const [selectedImage, setSelectedImage] = React.useState(0)

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-xl border">
        <div className="flex size-full items-center justify-center">
          <Image
            alt={images[selectedImage].altText}
            className="h-full w-full object-cover"
            layout="fullWidth"
            src={getImageUrl(
              images[selectedImage].imageUrl || 'placeholder.svg',
            )}
          />
        </div>
        <div className="absolute right-4 bottom-4 rounded-md border border-white/10 bg-[#0a0a0a]/80 px-2.5 py-1 text-white text-xs backdrop-blur-sm">
          {selectedImage + 1} / {images.length}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {images.map((image, index) => (
          <button
            aria-label={`View ${image.altText}`}
            className={cn(
              'relative aspect-square overflow-hidden rounded-lg border transition-all',
              selectedImage === index
                ? 'border border-primary'
                : 'border border-border',
            )}
            key={image.id}
            onClick={() => setSelectedImage(index)}
            type="button"
          >
            <div className="flex size-full items-center justify-center">
              <Image
                alt={`Vista ${index + 1}`}
                className="h-full w-full object-cover"
                layout="fullWidth"
                src={getImageUrl(image.imageUrl || 'placeholder.svg')}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
