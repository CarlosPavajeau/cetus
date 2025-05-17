import type { ProductForSale } from '@/api/products'
import { ProductCard } from '@/components/product/product-card'
import { SearchSlashIcon } from 'lucide-react'

const EmptyProductGrid = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-4 rounded-full bg-muted p-6">
      <SearchSlashIcon size={32} className="text-muted-foreground" />
    </div>
    <h2 className="mb-2 font-semibold text-2xl">No se encontraron productos</h2>
    <p className="mb-6 max-w-md text-muted-foreground">
      Intenta ajustar los filtros o buscar un producto diferente.
    </p>
  </div>
)

type Props = {
  products: ProductForSale[]
}

export function ProductGrid({ products }: Props) {
  if (!products.length) {
    return <EmptyProductGrid />
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
