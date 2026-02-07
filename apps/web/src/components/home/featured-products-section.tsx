import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { GoToAllProductsButton } from '@cetus/web/components/home/go-to-all-products-button'
import { ProductCard } from '@cetus/web/features/products/components/product-card'
import { SparklesIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            originalPrice={getSimulatedOriginalPrice(product, index)}
            priority={index < 4}
            product={product}
            showBadge={getProductBadge(index)}
            variant="featured"
          />
        ))}
      </div>

      <div className="flex justify-center md:hidden">
        <GoToAllProductsButton />
      </div>
    </div>
  )
}
