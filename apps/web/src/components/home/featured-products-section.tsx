import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { FeaturedProductCard } from '@cetus/web/features/products/components/featured-product-card'
import { Link } from '@tanstack/react-router'

type Props = {
  products: SimpleProductForSale[]
}

export function FeaturedProductsSection({ products }: Readonly<Props>) {
  return (
    <div className="mb-16 flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Badge className="w-fit rounded-md" variant="outline">
          Colección
        </Badge>
        <h2 className="text-balance font-bold text-3xl tracking-tight sm:text-4xl">
          Productos destacados
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <FeaturedProductCard
            key={`${product.id}-${product.variantId}-${product.slug}`}
            product={product}
          />
        ))}
      </div>

      <div className="grid">
        <Button asChild variant="link">
          <Link to="/products/all">Ver todos los productos</Link>
        </Button>
      </div>
    </div>
  )
}
