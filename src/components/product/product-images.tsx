import type { ProductForSale, ProductImage } from '@/api/products'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import { getImageUrl } from '@/shared/cdn'
import { cn } from '@/shared/cn'
import { Image } from '@unpic/react'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  product: ProductForSale
}

export function ProductImages({ product }: Props) {
  const images = useMemo(() => {
    if (product.images.length === 0) {
      return [
        {
          id: 1,
          imageUrl: product.imageUrl!,
          altText: product.name,
          sortOrder: 0,
        } satisfies ProductImage,
      ]
    }

    return product.images
  }, [product])

  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!api) {
      return
    }

    setCurrent(api.selectedScrollSnap())

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  return (
    <div className="space-y-4">
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={getImageUrl(image.imageUrl || 'placeholder.svg')}
                  alt={product.name}
                  layout="fullWidth"
                  className="h-full w-full object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="space-x-2">
        {images.map((image, index) => (
          <button
            key={index}
            className={cn(
              'h-20 w-20 overflow-hidden rounded opacity-50',
              current === index && 'border-primary opacity-100',
            )}
            onClick={() => api?.scrollTo(index)}
          >
            <Image
              src={getImageUrl(image.imageUrl || '/placeholder.svg')}
              alt={`Product view ${index + 1}`}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
