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
    <div className="flex min-w-0 flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-xl border">
        <Image
          alt={images[selectedImage].altText}
          className="size-full object-cover"
          fetchPriority="high"
          layout="fullWidth"
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          src={getImageUrl(images[selectedImage].imageUrl || 'placeholder.svg')}
        />
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
            <Image
              alt={`Vista ${index + 1}`}
              className="size-full object-cover"
              layout="fullWidth"
              sizes="(min-width: 1024px) 12vw, 25vw"
              src={getImageUrl(image.imageUrl || 'placeholder.svg')}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
