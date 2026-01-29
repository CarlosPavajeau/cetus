import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { ProductCard } from '@cetus/web/features/products/components/product-card'
import { PackageSearchIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

const EmptyProductGrid = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="mb-4 rounded-full bg-muted p-6">
      <HugeiconsIcon
        className="h-10 w-10 text-muted-foreground"
        icon={PackageSearchIcon}
      />
    </div>
    <h2 className="mb-2 font-heading font-semibold text-xl">
      No se encontraron productos
    </h2>
    <p className="max-w-md text-muted-foreground text-sm">
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
    <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-6">
      {products.map((product) => (
        <ProductCard
          key={`${product.id}-${product.variantId}`}
          product={product}
        />
      ))}
    </div>
  )
}
