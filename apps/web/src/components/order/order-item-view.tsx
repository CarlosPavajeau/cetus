import { Image } from '@unpic/react'
import type { ProductOptionValue } from '@/api/products'
import { Currency } from '@/components/currency'
import { Badge } from '@/components/ui/badge'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { getImageUrl } from '@/shared/cdn'

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

        <ItemDescription>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {item.optionValues.map((value) => (
                <Badge className="text-xs" key={value.id} variant="outline">
                  {value.optionTypeName}: {value.value}
                </Badge>
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
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}
