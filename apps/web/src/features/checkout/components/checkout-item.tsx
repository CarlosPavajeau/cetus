import { getImageUrl } from '@cetus/shared/utils/image'
import { Currency } from '@cetus/web/components/currency'
import type { CartItem } from '@cetus/web/store/cart'
import { Image } from '@unpic/react'
import { memo } from 'react'

type CheckoutItemProps = {
  item: CartItem
}

export const CheckoutItem = memo(function CheckoutItem({
  item,
}: CheckoutItemProps) {
  const { product, quantity } = item
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="relative shrink-0">
        <div className="size-16 overflow-hidden rounded-lg border bg-muted">
          <Image
            alt={product.name}
            className="object-cover"
            height={64}
            layout="constrained"
            objectFit="cover"
            src={getImageUrl(product.imageUrl || 'placeholder.svg')}
            width={64}
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm leading-tight">
          {product.name}
        </p>
        {product.optionValues.length > 0 && (
          <p className="mt-0.5 truncate text-muted-foreground text-xs">
            {product.optionValues
              .map((v) => `${v.optionTypeName}: ${v.value}`)
              .join(' · ')}
          </p>
        )}

        <p className="mt-0.5 truncate text-muted-foreground text-xs">
          <Currency currency="COP" value={product.price} /> x {quantity}
        </p>
      </div>

      <span className="shrink-0 font-semibold text-sm tabular-nums">
        <Currency currency="COP" value={product.price * quantity} />
      </span>
    </div>
  )
})
