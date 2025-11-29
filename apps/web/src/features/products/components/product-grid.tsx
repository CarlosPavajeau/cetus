import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { ProductCard } from '@cetus/web/features/products/components/product-card'
import { SearchSlashIcon } from 'lucide-react'

const EmptyProductGrid = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-4 rounded-full bg-muted p-6">
      <SearchSlashIcon className="text-muted-foreground" size={32} />
    </div>
    <h2 className="mb-2 font-semibold text-2xl">No se encontraron productos</h2>
    <p className="mb-6 max-w-md text-muted-foreground">
      Intenta ajustar los filtros o buscar un producto diferente.
    </p>
  </div>
)

type Props = {
  products: SimpleProductForSale[]
}

export function ProductGrid({ products }: Readonly<Props>) {
  if (!products.length) {
    return <EmptyProductGrid />
  }

  return (
    <div className="grid w-full grid-cols-1 flex-col items-center gap-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={`${product.id}-${product.variantId}`}
          product={product}
        />
      ))}
    </div>
  )
}
