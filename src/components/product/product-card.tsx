import type { ProductForSale } from '@/api/products'
import { Currency } from '@/components/currency'
import { StarRating } from '@/components/product/star-rating'
import { getImageUrl } from '@/shared/cdn'
import { Link } from '@tanstack/react-router'
import { Image } from '@unpic/react'

import { memo } from 'react'

type Props = {
  product: ProductForSale
}

function ProductCardComponent({ product }: Props) {
  return (
    <Link to="/products/$slug" params={{ slug: product.slug }}>
      <div className="overflow-hidden rounded">
        <div className="group relative flex aspect-square cursor-pointer items-center justify-center rounded rounded-b-none">
          <Image
            src={getImageUrl(product.imageUrl || 'placeholder.svg')}
            alt={product.name}
            height={400}
            width={400}
            layout="constrained"
            objectFit="cover"
            sizes="(max-width: 768px) 50vw, 33vw"
            className="rounded rounded-b-none object-cover transition group-hover:scale-105"
            background="auto"
            priority
          />
        </div>

        <div className="pt-2">
          <h3 className="w-full truncate pt-2 font-heading font-medium md:text-base">
            {product.name}
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-xs">{product.rating}</span>
            <StarRating rating={product.rating} size={3} className="m-0 p-0" />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="font-medium text-base">
              <Currency value={product.price} currency="COP" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export const ProductCard = memo(ProductCardComponent)
