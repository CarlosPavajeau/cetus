import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { Badge } from '@cetus/web/components/ui/badge'
import { Button } from '@cetus/web/components/ui/button'
import { FeaturedProductCard } from '@cetus/web/features/products/components/featured-product-card'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

type Props = {
  products: SimpleProductForSale[]
}

export function SuggestedProducts({ products }: Readonly<Props>) {
  if (!products.length) {
    return null
  }

  return (
    <section className="border-border border-t py-16">
      <div className="mb-10 flex items-end justify-between">
        <div className="flex flex-col gap-3">
          <Badge
            className="w-fit border-border text-muted-foreground text-xs"
            variant="outline"
          >
            También le puede interesar
          </Badge>
          <h2 className="text-balance font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
            Completa el look.
          </h2>
        </div>
        <Button
          asChild
          className="hidden h-9 gap-1 text-muted-foreground text-sm hover:text-foreground sm:flex"
          variant="ghost"
        >
          <Link to="/products/all">
            Ver todos
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <FeaturedProductCard
            key={`${product.id}:${product.variantId}`}
            product={product}
          />
        ))}
      </div>
    </section>
  )
}
