import type { ProductForSale } from '@/api/products'
import { ProductCard } from '@/components/product/product-card'
import { ShoppingCart } from 'lucide-react'

const EmptyProductGrid = () => (
  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border bg-muted/30 p-6 text-center">
    <div className="mb-4 rounded-full bg-muted p-3">
      <ShoppingCart size={24} className="text-muted-foreground" />
    </div>
    <h3 className="mb-2 font-medium text-lg">No hay productos disponibles</h3>
    <p className="mb-4 text-muted-foreground">
      Vuelve más tarde para encontrar productos interesantes.
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
