import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { getImageUrl } from '@cetus/shared/utils/image'
import { Currency } from '@cetus/web/components/currency'
import { Badge } from '@cetus/web/components/ui/badge'
import { Link } from '@tanstack/react-router'
import { Image } from '@unpic/react'
import { ShoppingBag } from 'lucide-react'

type Props = {
  product: SimpleProductForSale
  isLCP?: boolean
}

export function FeaturedProductCard({
  product,
  isLCP = false,
}: Readonly<Props>) {
  const originalPrice = product.compareAtPrice
  const hasDiscount = originalPrice && originalPrice > product.price
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : 0

  return (
    <Link
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors"
      params={{ slug: product.slug }}
      preload="intent"
      search={{ variant: product.variantId }}
      to="/products/$slug"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-card">
        <div className="flex flex-col items-center gap-3">
          <Image
            alt={product.name}
            background="auto"
            fetchPriority={isLCP ? 'high' : 'auto'}
            height={396}
            layout="constrained"
            loading={isLCP ? 'eager' : 'lazy'}
            priority={isLCP}
            src={getImageUrl(product.imageUrl)}
            width={396}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="inline-flex h-9 items-center rounded-md bg-white px-4 font-semibold text-[#0a0a0a] text-xs">
            <ShoppingBag className="mr-1.5 size-3.5" />
            Ver detalles
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm">{product.name}</h3>
          {discountPercentage > 0 && (
            <Badge
              className="shrink-0 border-destructive text-[10px] text-destructive"
              variant="outline"
            >
              -{discountPercentage}%
            </Badge>
          )}
        </div>
        {product.description && (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {product.description}
          </p>
        )}
        <div className="flex items-center gap-2 pt-2">
          <p className="mt-auto font-semibold text-sm">
            <Currency currency="COP" value={product.price} />
          </p>
          {hasDiscount && (
            <span className="text-muted-foreground text-sm line-through">
              <Currency currency="COP" value={originalPrice} />
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
