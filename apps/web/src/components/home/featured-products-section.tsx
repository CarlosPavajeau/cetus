import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { Carousel, CarouselContent, CarouselItem } from '@cetus/ui/carousel'
import { GoToAllProductsButton } from '@cetus/web/components/home/go-to-all-products-button'
import { ProductCard } from '@cetus/web/features/products/components/product-card'
import { SparklesIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Autoplay from 'embla-carousel-autoplay'
import { useRef } from 'react'

type Props = {
  products: SimpleProductForSale[]
}

// TODO: Implement originalPrice in backend to show discounts
// For now, simulate some products having discounts
function getSimulatedOriginalPrice(
  product: SimpleProductForSale,
  index: number,
): number | undefined {
  // Simulate ~30% of products having a discount
  if (index % 3 === 0) {
    return Math.round(product.price * 1.2) // 20% discount
  }
  return undefined
}

function getProductBadge(index: number): 'new' | 'featured' | null {
  if (index === 0) {
    return 'new'
  }
  if (index < 3) {
    return 'featured'
  }
  return null
}

export function FeaturedProductsSection({ products }: Readonly<Props>) {
  const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: true }))

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <HugeiconsIcon icon={SparklesIcon} />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-2xl">
              Productos Destacados
            </h2>
            <p className="text-muted-foreground text-sm">
              Seleccionados especialmente para ti
            </p>
          </div>
        </div>
        <div className="hidden md:flex">
          <GoToAllProductsButton />
        </div>
      </div>

      <div className="relative w-full px-0 md:px-12">
        <Carousel
          className="w-full"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
          opts={{
            align: 'start',
            loop: true,
          }}
          plugins={[plugin.current]}
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {products.map((product, index) => (
              <CarouselItem
                className="basis-1/2 pl-2 md:basis-1/3 md:pl-4 lg:basis-1/4 xl:basis-1/5"
                key={product.id}
              >
                <ProductCard
                  originalPrice={getSimulatedOriginalPrice(product, index)}
                  product={product}
                  showBadge={getProductBadge(index)}
                  variant="featured"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="flex justify-center md:hidden">
        <GoToAllProductsButton />
      </div>
    </div>
  )
}
