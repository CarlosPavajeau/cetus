import type { ProductOptionValue } from '@cetus/api-client/types/products'
import { getImageUrl } from '@cetus/shared/utils/image'
import { Badge } from '@cetus/ui/badge'
import { Item, ItemContent, ItemMedia, ItemTitle } from '@cetus/ui/item'
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
    <Item key={item.id} role="listitem" size="sm" variant="outline">
      <ItemMedia className="size-20" variant="image">
        <Image
          alt={item.productName}
          className="object-cover"
          height={128}
          layout="constrained"
          objectFit="cover"
          src={getImageUrl(item.imageUrl || 'placeholder.svg')}
          width={128}
        />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="line-clamp-1">{item.productName}</ItemTitle>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {item.optionValues.map((value) => (
              <span className="text-muted-foreground text-xs" key={value.id}>
                {value.optionTypeName}: {value.value}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <Badge variant="secondary">
              <span>
                Precio: <Currency currency="COP" value={item.price} />
              </span>
            </Badge>

            <Badge variant="secondary">
              <span>Cantidad: {item.quantity}</span>
            </Badge>
          </div>
        </div>
      </ItemContent>
    </Item>
  )
}
