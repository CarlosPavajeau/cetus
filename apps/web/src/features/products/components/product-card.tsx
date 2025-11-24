import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { getImageUrl } from '@cetus/shared/utils/image'
import { Currency } from '@cetus/web/components/currency'
import { StarRating } from '@cetus/web/features/products/components/star-rating'
import { Link } from '@tanstack/react-router'
import { Image } from '@unpic/react'
import { memo } from 'react'

type Props = {
  product: SimpleProductForSale
}

function ProductCardComponent({ product }: Readonly<Props>) {
  return (
    <Link
      params={{ slug: product.slug }}
      preload="intent"
      search={{ variant: product.variantId }}
      to="/products/$slug"
    >
      <div className="overflow-hidden rounded">
        <div className="group relative flex aspect-square cursor-pointer items-center justify-center rounded rounded-b-none">
          <Image
            alt={product.name}
            background="auto"
            className="rounded rounded-b-none object-cover transition group-hover:scale-105"
            height={400}
            layout="constrained"
            objectFit="cover"
            priority
            sizes="(max-width: 768px) 50vw, 33vw"
            src={getImageUrl(product.imageUrl || 'placeholder.svg')}
            width={400}
          />
        </div>

        <div className="pt-2">
          <h3 className="w-full truncate pt-2 font-heading font-medium md:text-base">
            {product.name}
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-xs">{product.rating}</span>
            <StarRating className="m-0 p-0" rating={product.rating} size={3} />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="font-medium text-base">
              <Currency currency="COP" value={product.price} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export const ProductCard = memo(ProductCardComponent)
