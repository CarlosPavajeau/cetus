import type { Order } from '@cetus/api-client/types/orders'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import { ItemGroup } from '@cetus/ui/item'
import { Currency } from '@cetus/web/components/currency'
import { Separator } from '@cetus/web/components/ui/separator'
import { OrderItemView } from './order-item-view'

type Props = {
  order: Order
}

export function OrderItemsList({ order }: Readonly<Props>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos</CardTitle>
      </CardHeader>

      <CardContent>
        <ItemGroup className="gap-2">
          {order.items.map((item) => (
            <OrderItemView item={item} key={item.id} />
          ))}
        </ItemGroup>
      </CardContent>

      <CardFooter className="border-t">
        <div className="w-full space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>
              <Currency currency="COP" value={order.subtotal} />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Descuento</span>
            <span className="text-destructive">
              - <Currency currency="COP" value={order.discount} />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total a pagar</span>
            <span>
              <Currency currency="COP" value={order.total} />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Envío</span>
            <span>
              <Currency currency="COP" value={order.deliveryFee || 0} />
            </span>
          </div>

          <Separator />

          <div className="mt-2 flex justify-between font-medium">
            <span>Total</span>
            <span>
              <Currency
                currency="COP"
                value={order.total + (order.deliveryFee || 0)}
              />
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
