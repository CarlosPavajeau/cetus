import { OrderStatusColor, OrderStatusText } from '@/api/orders'
import { Currency } from '@/components/currency'
import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { FormattedDate } from '@/components/formatted-date'
import Image from '@/components/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOrder } from '@/hooks/orders'
import { getImageUrl } from '@/shared/cdn'
import { cn } from '@/shared/cn'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  MailIcon,
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
  ShoppingBagIcon,
  UserIcon,
} from 'lucide-react'

export const Route = createFileRoute('/orders/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { order, isLoading } = useOrder(id)

  if (isLoading) {
    return (
      <DefaultPageLayout>
        <DefaultLoader />
      </DefaultPageLayout>
    )
  }

  if (!order) {
    return (
      <DefaultPageLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-6">
            <PackageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="mb-2 font-semibold text-xl">Pedido no encontrado</h2>
          <p className="mb-6 text-muted-foreground">
            El pedido que buscas no existe o ha sido eliminado
          </p>

          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <ShoppingBagIcon className="mr-2" />
              Volver a la tienda
            </Link>
          </Button>
        </div>
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Pedido #{order.orderNumber}</h2>
        </div>

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
                    src={getImageUrl(item.imageUrl || '/placeholder.svg')}
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

        <div className="space-y-3">
          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <ShoppingBagIcon className="mr-2" />
              Seguir comprando
            </Link>
          </Button>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
