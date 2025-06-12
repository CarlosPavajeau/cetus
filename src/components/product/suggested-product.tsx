import type { ProductForSale } from '@/api/products'
import { ProductCard } from '@/components/product/product-card'

type Props = {
  products: ProductForSale[]
}

export function SuggestedProducts({ products }: Props) {
  if (!products.length) {
    return null
  }

  return (
    <div>
      <h2 className="mb-6 font-bold text-xl">Productos sugeridos</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
