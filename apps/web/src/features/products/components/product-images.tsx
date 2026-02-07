import type { ProductImage } from '@cetus/api-client/types/products'
import { getImageUrl } from '@cetus/shared/utils/image'
import { cn } from '@cetus/web/shared/utils'
import { Image } from '@unpic/react'
import { useState } from 'react'

type Props = {
  images: ProductImage[]
}

export function ProductImages({ images }: Readonly<Props>) {
  const [current, setCurrent] = useState(0)
  const activeImage = images[current] ?? images[0]

  if (!activeImage) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <Image
          alt={activeImage.altText}
          className="h-full w-full object-cover"
          layout="fullWidth"
          src={getImageUrl(activeImage.imageUrl || 'placeholder.svg')}
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((image, index) => (
            <button
              aria-current={current === index}
              aria-label={`Ver imagen ${index + 1}`}
              className={cn(
                'h-16 w-16 overflow-hidden rounded-md border-2 transition-all',
                current === index
                  ? 'border-primary opacity-100'
                  : 'border-transparent opacity-60 hover:opacity-90',
              )}
              key={image.id}
              onClick={() => setCurrent(index)}
              type="button"
            >
              <Image
                alt={`Vista ${index + 1}`}
                className="h-full w-full object-cover"
                height={64}
                loading="lazy"
                src={getImageUrl(image.imageUrl || 'placeholder.svg')}
                width={64}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
