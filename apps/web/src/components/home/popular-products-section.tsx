import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { GoToAllProductsButton } from '@cetus/web/components/home/go-to-all-products-button'
import { ProductGrid } from '@cetus/web/features/products/components/product-grid'

type Props = {
  products: SimpleProductForSale[]
}

export function PopularProductsSection({ products }: Readonly<Props>) {
  return (
    <div className="my-8 flex flex-col items-center gap-6 rounded bg-muted p-6">
      <p className="w-full text-left font-heading font-medium text-3xl">
        Productos populares
      </p>

      <ProductGrid products={products} />

      <div className="flex">
        <GoToAllProductsButton />
      </div>
    </div>
  )
}
