import type { Order } from '@cetus/api-client/types/orders'
import { Card } from '@cetus/ui/card'
import { ItemGroup, ItemSeparator } from '@cetus/ui/item'
import { Separator } from '@cetus/ui/separator'
import { Currency } from '@cetus/web/components/currency'
import { OrderItemView } from '@cetus/web/features/orders/components/order-item-view'

type Props = {
  order: Order
}

export function OrderItemsList({ order }: Readonly<Props>) {
  return (
    <>
      <Card className="gap-3 p-5">
        <h2 className="font-semibold text-lg">
          Productos ({order.items.length})
        </h2>

        <ItemGroup>
          {order.items.map((item, index) => (
            <>
              <OrderItemView item={item} key={item.id} />
              {index < order.items.length - 1 && <ItemSeparator />}
            </>
          ))}
        </ItemGroup>
      </Card>

      <Card className="gap-3 p-5">
        <h2 className="font-semibold text-lg">Resumen de la orden</h2>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Subtotal ({order.items.length} productos)
          </span>
          <span className="font-medium">
            <Currency currency="COP" value={order.subtotal} />
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Descuento</span>
          <span className="font-medium">
            <Currency currency="COP" value={order.discount} />
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Envío</span>
          <span className="font-medium">
            <Currency currency="COP" value={order.deliveryFee || 0} />
          </span>
        </div>

        <Separator />

        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-lg">
            <Currency
              currency="COP"
              value={order.total + (order.deliveryFee || 0)}
            />
          </span>
        </div>
      </Card>
    </>
  )
}
