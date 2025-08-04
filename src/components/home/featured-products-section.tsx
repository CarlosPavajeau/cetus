import type { SimpleProductForSale } from '@/api/products'
import { GoToAllProductsButton } from '@/components/home/go-to-all-products-button'
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

export function FeaturedProductsSection({ products }: Props) {
  const plugin = useRef(Autoplay({ delay: 2000, stopOnInteraction: false }))

  return (
    <div className="flex flex-col items-center gap-6 pb-6">
      <p className="w-full text-left font-heading font-medium text-2xl">
        Productos destacados
      </p>

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

      <div className="flex">
        <GoToAllProductsButton />
      </div>
    </div>
  )
}
