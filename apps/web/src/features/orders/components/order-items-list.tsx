import type { Order } from '@cetus/api-client/types/orders'
import { Card } from '@cetus/ui/card'
import { ItemGroup } from '@cetus/ui/item'
import { Currency } from '@cetus/web/components/currency'
import { Button } from '@cetus/web/components/ui/button'
import { OrderItemView } from '@cetus/web/features/orders/components/order-item-view'

type Props = {
  order: Order
}

export function OrderItemsList({ order }: Readonly<Props>) {
  return (
    <>
      <Card className="gap-2 p-6">
        <h2 className="font-semibold text-lg">
          Productos ({order.items.length})
        </h2>

        <div className="space-y-3">
          <ItemGroup className="gap-2">
            {order.items.map((item) => (
              <OrderItemView item={item} key={item.id} />
            ))}
          </ItemGroup>
        </div>
      </Card>

      <Card className="gap-2 p-6">
        <h2 className="font-semibold text-lg">Resumen de la orden</h2>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <div className="text-right">
              <div className="mb-1 text-muted-foreground text-xs">
                {order.items.length} productos
              </div>
              <div className="font-medium">
                <Currency currency="COP" value={order.subtotal} />
              </div>
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Descuento</span>
            <div className="text-right">
              <div className="mb-1 text-muted-foreground text-xs">
                Código aplicado
              </div>
              <div className="font-medium">
                <Currency currency="COP" value={order.discount} />
              </div>
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Envío</span>
            <div className="text-right">
              <div className="mb-1 text-muted-foreground text-xs">
                Método de envío
              </div>
              <div className="font-medium">
                <Currency currency="COP" value={order.deliveryFee || 0} />
              </div>
            </div>
          </div>

          <div className="flex justify-between border-border border-t pt-3 font-semibold">
            <span>Total</span>
            <span className="text-lg">
              <Currency
                currency="COP"
                value={order.total + (order.deliveryFee || 0)}
              />
            </span>
          </div>
        </div>

        <div className="mt-6 border-border border-t pt-6">
          <div className="mb-3 text-muted-foreground text-sm">
            Factura enviada al correo del cliente
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-transparent"
              disabled
              variant="outline"
            >
              Enviar factura
            </Button>
            <Button className="flex-1" disabled>
              Agregar pago
            </Button>
          </div>
        </div>
      </Card>
    </>
  )
}
