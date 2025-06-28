import { type Order, OrderStatusColor, OrderStatusText } from '@/api/orders'
import { Currency } from '@/components/currency'
import { FormattedDate } from '@/components/formatted-date'
import Image from '@/components/image'
import { Badge } from '@/components/ui/badge'
import { getImageUrl } from '@/shared/cdn'
import { cn } from '@/shared/cn'
import { MailIcon, MapPinIcon, PhoneIcon, UserIcon } from 'lucide-react'

type Props = {
  order: Order
  showId?: boolean
}

export function OrderSummary({ order, showId = false }: Props) {
  return (
    <>
      <div className="space-y-3 rounded-md border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Estado del pedido</h3>
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
        </div>

        <p className="text-muted-foreground text-sm">
          Realizado el <FormattedDate date={new Date(order.createdAt)} />
        </p>

        {showId && (
          <p className="text-muted-foreground text-sm">
            Id del pedido: {order.id}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-4">
          <h3 className="font-medium">Productos</h3>
        </div>

        <div className="divide-y">
          {order.items.map((item) => (
            <div key={item.id} className="flex p-4">
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={getImageUrl(item.imageUrl || 'placeholder.svg')}
                  alt={item.productName}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>

              <div className="ml-3 flex-1">
                <div className="flex justify-between">
                  <h4 className="line-clamp-1 font-medium text-sm">
                    {item.productName}
                  </h4>
                  <span className="ml-2 font-medium text-sm">
                    <Currency
                      value={item.price * item.quantity}
                      currency="COP"
                    />
                  </span>
                </div>

                <div className="mt-1 flex items-center">
                  <span className="text-muted-foreground text-xs">
                    <Currency value={item.price} currency="COP" /> ×{' '}
                    {item.quantity}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 bg-background p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>
              <Currency value={order.subtotal} currency="COP" />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Descuento</span>
            <span className="text-destructive">
              - <Currency value={order.discount} currency="COP" />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total a pagar</span>
            <span>
              <Currency value={order.total} currency="COP" />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Envío</span>
            <span>
              <Currency value={order.deliveryFee || 0} currency="COP" />
            </span>
          </div>

          <div className="mt-2 flex justify-between border-t pt-2 font-medium">
            <span>Total</span>
            <span>
              <Currency
                value={order.total + (order.deliveryFee || 0)}
                currency="COP"
              />
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-medium">Información de envío</h3>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <UserIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{order.customer.name}</span>
          </div>

          <div className="flex items-start gap-2">
            <MapPinIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div>{order.address}</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <PhoneIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{order.customer.phone}</span>
          </div>

          <div className="flex items-start gap-2">
            <MailIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{order.customer.email}</span>
          </div>
        </div>
      </div>
    </>
  )
}
