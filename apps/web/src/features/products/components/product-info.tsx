import type {
  ProductForSale,
  ProductVariantResponse,
} from '@cetus/api-client/types/products'
import { Badge } from '@cetus/ui/badge'
import { Currency } from '@cetus/web/components/currency'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@cetus/web/components/ui/breadcrumb'
import { ProductOptionSelector } from '@cetus/web/features/products/components/product-option-selector'
import { ProductQuantitySelector } from '@cetus/web/features/products/components/product-quantity-selector'
import { Link } from '@tanstack/react-router'
import { StarRating } from './star-rating'

type Props = {
  product: ProductForSale
  variant: ProductVariantResponse
}

export function ProductInfo({ product, variant }: Props) {
  const originalPrice = variant.compareAtPrice
  const hasDiscount = originalPrice && originalPrice > variant.price
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - variant.price) / originalPrice) * 100)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-muted-foreground text-xs"
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="text-xs">
              <Link aria-label="Ir al inicio" to="/">
                Inicio
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="text-xs">
              <BreadcrumbLink asChild>
                <Link
                  aria-label={`Categoría: ${product.category}`}
                  params={{ slug: product.categorySlug }}
                  to="/categories/$slug"
                >
                  {product.category}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="text-xs">
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </nav>

      <div className="flex flex-col gap-3">
        <h1 className="text-balance font-bold text-3xl text-foreground tracking-tight sm:text-4xl">
          {product.name}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <StarRating maxRating={5} rating={product.rating} size={4} />

        <span className="font-medium text-foreground text-sm">
          {product.rating}
        </span>
        <span className="text-muted-foreground text-sm">
          ({product.reviewsCount}{' '}
          {product.reviewsCount > 1 ? 'calificaciones' : 'calificación'})
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="font-bold text-3xl text-foreground tracking-tight">
          <Currency currency="COP" value={variant.price} />
        </span>
        {hasDiscount && (
          <>
            <span className="text-lg text-muted-foreground line-through">
              <Currency currency="COP" value={originalPrice} />
            </span>
            <Badge className="rounded-md bg-destructive font-medium text-primary-foreground text-xs">
              -{discountPercentage}%
            </Badge>
          </>
        )}
      </div>

      <p className="text-pretty text-muted-foreground leading-relaxed">
        {product.description}
      </p>

      <ProductOptionSelector currentVariantId={variant.id} product={product} />

      <ProductQuantitySelector product={product} variant={variant} />
    </div>
  )
}
