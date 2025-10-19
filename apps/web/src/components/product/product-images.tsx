import { Image } from '@unpic/react'
import consola from 'consola'
import { useEffect, useState } from 'react'
import type { ProductImage } from '@/api/products'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import { getImageUrl } from '@/shared/cdn'
import { cn } from '@/shared/cn'

type Props = {
  images: ProductImage[]
}

export function ProductImages({ images }: Readonly<Props>) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!api) {
      return () => consola.log('Carousel API not initialized')
    }

    setCurrent(api.selectedScrollSnap())

    const onSelect = () => setCurrent(api.selectedScrollSnap())
    api.on('select', onSelect)

    return () => api.off?.('select', onSelect)
  }, [api])

  return (
    <div className="space-y-4">
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent>
          {images.map((image) => (
            <CarouselItem key={image.id}>
              <div className="relative aspect-square overflow-hidden">
                <Image
                  alt={image.altText}
                  className="h-full w-full object-cover"
                  layout="fullWidth"
                  src={getImageUrl(image.imageUrl || 'placeholder.svg')}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="space-x-2">
        {images.map((image, index) => (
          <button
            aria-current={current === index}
            className={cn(
              'h-20 w-20 overflow-hidden rounded opacity-50',
              current === index && 'opacity-100',
            )}
            key={image.id}
            onClick={() => api?.scrollTo(index)}
            type="button"
          >
            <Image
              alt={`Product view ${index + 1}`}
              className="h-full w-full object-cover"
              height={80}
              loading="lazy"
              src={getImageUrl(image.imageUrl || 'placeholder.svg')}
              width={80}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
