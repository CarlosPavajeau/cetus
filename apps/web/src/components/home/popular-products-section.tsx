import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { GoToAllProductsButton } from '@cetus/web/components/home/go-to-all-products-button'
import { ProductCard } from '@cetus/web/features/products/components/product-card'
import { Fire02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

type Props = {
  products: SimpleProductForSale[]
}

// TODO: Implement originalPrice in backend to show discounts
function getSimulatedOriginalPrice(
  product: SimpleProductForSale,
  index: number,
): number | undefined {
  // Simulate ~25% of popular products having a discount
  if (index % 4 === 1) {
    return Math.round(product.price * 1.15) // 15% discount
  }
  return undefined
}

export function PopularProductsSection({ products }: Readonly<Props>) {
  if (!products.length) {
    return null
  }

  return (
    <div className="my-8 rounded-xl bg-linear-to-br from-muted/80 to-muted p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
            <HugeiconsIcon className="h-5 w-5" icon={Fire02Icon} />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-2xl md:text-3xl">
              Productos Populares
            </h2>
            <p className="flex items-center gap-1 text-muted-foreground text-sm">
              Los más vendidos esta semana
            </p>
          </div>
        </div>
        <div className="hidden md:flex">
          <GoToAllProductsButton />
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-6">
        {products.map((product, index) => (
          <ProductCard
            key={`${product.id}-${product.variantId}`}
            originalPrice={getSimulatedOriginalPrice(product, index)}
            product={product}
            showBadge={index < 2 ? 'popular' : null}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-center md:hidden">
        <GoToAllProductsButton />
      </div>
    </div>
  )
}
