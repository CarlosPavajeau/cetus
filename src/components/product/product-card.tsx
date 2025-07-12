import type { ProductForSale } from '@/api/products'
import { Currency } from '@/components/currency'
import { Image } from '@/components/image'
import { StarRating } from '@/components/product/star-rating'
import { getImageUrl } from '@/shared/cdn'
import { Link } from '@tanstack/react-router'
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
            fill
            className="rounded rounded-b-none object-cover transition group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QOQvhwAAAABJRU5ErkJggg=="
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
