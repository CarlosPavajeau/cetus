import type { SimpleProductForSale } from '@/api/products'
import { Currency } from '@/components/currency'
import { StarRating } from '@/components/product/star-rating'
import { getImageUrl } from '@/shared/cdn'
import { Link } from '@tanstack/react-router'
import { Image } from '@unpic/react'
import { memo } from 'react'

type Props = {
  product: SimpleProductForSale
}

function ProductCardComponent({ product }: Readonly<Props>) {
  return (
    <Link params={{ slug: product.slug }} to="/products/$slug">
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
