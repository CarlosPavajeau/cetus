import type { ProductOptionValue } from '@cetus/api-client/types/products'
import { getImageUrl } from '@cetus/shared/utils/image'
import { Currency } from '@cetus/web/components/currency'
import { Image } from '@unpic/react'

type OrderItem = {
  id: string
  productName: string
  imageUrl?: string
  optionValues: ProductOptionValue[]
  price: number
  quantity: number
}

type Props = {
  item: OrderItem
}

export function OrderItemView({ item }: Props) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="relative shrink-0">
        <div className="size-16 overflow-hidden rounded-lg border bg-muted">
          <Image
            alt={item.productName}
            className="object-cover"
            height={64}
            layout="constrained"
            objectFit="cover"
            src={getImageUrl(item.imageUrl || 'placeholder.svg')}
            width={64}
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm leading-tight">
          {item.productName}
        </p>
        {item.optionValues.length > 0 && (
          <p className="mt-0.5 truncate text-muted-foreground text-xs">
            {item.optionValues
              .map((v) => `${v.optionTypeName}: ${v.value}`)
              .join(' · ')}
          </p>
        )}

        <p className="mt-0.5 truncate text-muted-foreground text-xs">
          <Currency currency="COP" value={item.price} /> x {item.quantity}
        </p>
      </div>

      <span className="shrink-0 font-semibold text-sm tabular-nums">
        <Currency currency="COP" value={item.price * item.quantity} />
      </span>
    </div>
  )
}
