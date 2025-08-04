import type { SimpleProductForSale } from '@/api/products'
import { ProductCard } from '@/components/product/product-card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { useRef } from 'react'

type Props = {
  products: SimpleProductForSale[]
}

export function SuggestedProducts({ products }: Props) {
  const plugin = useRef(Autoplay({ delay: 2000, stopOnInteraction: false }))

  if (!products.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="w-full text-left font-heading font-medium text-2xl">
        Productos sugeridos
      </h2>

      <div className="w-full">
        <Carousel
          plugins={[plugin.current]}
          className="w-full"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
        >
          <CarouselContent className="-ml-1">
            {products.map((product) => (
              <CarouselItem key={product.id} className="pl-4 md:basis-1/5">
                <ProductCard key={product.id} product={product} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  )
}
