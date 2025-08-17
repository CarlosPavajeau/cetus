import type { SimpleProductForSale } from '@/api/products'
import { ProductCard } from '@/components/product/product-card'

type Props = {
  products: SimpleProductForSale[]
}

export function SuggestedProducts({ products }: Readonly<Props>) {
  if (!products.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="w-full text-left font-heading font-medium text-2xl">
        Productos sugeridos
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
