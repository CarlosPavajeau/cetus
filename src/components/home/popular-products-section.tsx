import type { ProductForSale } from '@/api/products'
import { ProductGrid } from '@/components/product/product-grid'
import { Button } from '@/components/ui/button'
import { ArrowRightIcon } from 'lucide-react'

type Props = {
  products: ProductForSale[]
}

export function PopularProductsSection({ products }: Props) {
  return (
    <div className="my-8 flex flex-col items-center gap-6 rounded bg-muted p-4">
      <p className="w-full text-center font-heading font-medium text-3xl">
        Productos populares
      </p>

      <ProductGrid products={products} />

      <div className="flex">
        <Button size="lg" className="group">
          Ver todos
          <ArrowRightIcon
            className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
            size={16}
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  )
}
