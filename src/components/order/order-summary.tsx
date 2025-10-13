import { type Order, OrderStatusColor, OrderStatusText } from '@/api/orders'
import { Currency } from '@/components/currency'
import { FormattedDate } from '@/components/formatted-date'
import { PaymentSummary } from '@/components/order/payment-summary'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'
import { getImageUrl } from '@/shared/cdn'
import { cn } from '@/shared/cn'
import { Image } from '@unpic/react'
import { MailIcon, MapPinIcon, PhoneIcon, UserIcon } from 'lucide-react'

type Props = {
  order: Order
  isCustomer?: boolean
}

export function OrderSummary({ order, isCustomer = false }: Readonly<Props>) {
  return (
    <div className="space-y-6">
      {!isCustomer && (
        <div className="space-y-1">
          <div className="flex items-center justify-between space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xl"># {order.orderNumber}</h2>

              <Badge variant="outline">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 rounded-full',
                    OrderStatusColor[order.status],
                  )}
                />
                {OrderStatusText[order.status]}
              </Badge>
            </div>
          </div>

          <p className="text-muted-foreground text-sm">
            Realizado el <FormattedDate date={new Date(order.createdAt)} />
          </p>
        </div>
      )}

      <div className={cn('grid gap-6', !isCustomer && 'lg:grid-cols-2')}>
        <Card>
          <CardHeader>
            <CardTitle>Información de envío</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <UserIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{order.customer.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPinIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div>
                    {order.address} - {order.city}, {order.state}
                  </div>
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
          </CardContent>
        </Card>

        {!isCustomer && <PaymentSummary order={order} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>

        <CardContent>
          <ItemGroup className="gap-2">
            {order.items.map((item) => (
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
                  <ItemTitle className="line-clamp-1">
                    {item.productName}
                  </ItemTitle>

                  <ItemDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {item.optionValues.map((value) => (
                          <Badge
                            className="text-xs"
                            key={value.id}
                            variant="outline"
                          >
                            {value.optionTypeName}: {value.value}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          <span>
                            Precio:{' '}
                            <Currency currency="COP" value={item.price} />
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
    </div>
  )
}
