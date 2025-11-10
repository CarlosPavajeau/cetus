import { Image } from '@unpic/react'
import consola from 'consola'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
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
      <div className="relative w-full">
        <Carousel
          className="w-full"
          opts={{
            align: 'start',
            loop: true,
          }}
          setApi={setApi}
        >
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

        {images.length > 1 && (
          <>
            <button
              aria-label="Previous image"
              className="-translate-y-1/2 absolute top-1/2 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-white shadow-sm transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50"
              onClick={() => api?.scrollPrev()}
              type="button"
            >
              <ChevronLeftIcon aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
            <button
              aria-label="Next image"
              className="-translate-y-1/2 absolute top-1/2 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-white shadow-sm transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50"
              onClick={() => api?.scrollNext()}
              type="button"
            >
              <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="-translate-x-1/2 absolute bottom-4 left-1/2 flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 shadow-sm">
            {images.map((img, index) => {
              const isActive = index === current
              return (
                <button
                  aria-current={isActive}
                  aria-label={`Go to image ${index + 1}`}
                  className={cn(
                    'h-2 w-2 rounded-full transition-colors',
                    isActive
                      ? 'bg-gray-800'
                      : 'bg-gray-400 hover:bg-gray-500 focus:bg-gray-500',
                  )}
                  key={img.id}
                  onClick={() => api?.scrollTo(index)}
                  type="button"
                >
                  {/* decorative dot; accessible name provided via aria-label */}
                </button>
              )
            })}
          </div>
        )}
      </div>

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
