import type { ProductForSale } from '@/api/products'
import { GoToAllProductsButton } from '@/components/home/go-to-all-products-button'
import { ProductGrid } from '@/components/product/product-grid'

type Props = {
  products: ProductForSale[]
}

export function PopularProductsSection({ products }: Props) {
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
