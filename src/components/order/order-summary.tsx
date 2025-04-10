import {
  type OrderStatus,
  OrderStatusColor,
  OrderStatusText,
} from '@/api/orders'
import { Currency } from '@/components/currency'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/shared/cn'

type Props = {
  order: {
    id?: string
    customer: {
      name: string
      phone: string
    }
    address: string
    total: number
    deliveryFee?: number
    createdAt?: string
    status?: OrderStatus
  }
  showStatus?: boolean
  showId?: boolean
}

export function OrderSummary({
  order,
  showStatus = false,
  showId = false,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-lg">Resumen del pedido</h2>

        {showStatus && order.status !== undefined && (
          <Badge variant="outline">
            <span
              className={cn(
                'size-1.5 rounded-full',
                OrderStatusColor[order.status],
              )}
              aria-hidden="true"
            ></span>
            {OrderStatusText[order.status]}
          </Badge>
        )}
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
        {showId && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Id</span>
            <span>{order.id}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Cliente</span>
          <span>{order.customer.name}</span>
        </div>

        <div className="flex flex-wrap justify-between text-sm">
          <span className="text-muted-foreground">Dirección</span>
          <span className="font-medium">{order.address}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Teléfono</span>
          <span className="font-medium">{order.customer.phone}</span>
        </div>

        {order.createdAt && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground text-sm">Fecha</span>
            <span>
              <FormattedDate date={new Date(order.createdAt)} />
            </span>
          </div>
        )}

        {order.deliveryFee !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground text-sm">
              Costo de envío
            </span>
            <span>
              <Currency value={order.deliveryFee} currency="COP" />
            </span>
          </div>
        )}

        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>
            <Currency value={order.total} currency="COP" />
          </span>
        </div>
      </div>
    </div>
  )
}
