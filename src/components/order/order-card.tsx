import {
  OrderStatus,
  OrderStatusColor,
  OrderStatusText,
  type SimpleOrder,
} from '@/api/orders'
import { Currency } from '@/components/currency'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/shared/cn'
import { Link } from '@tanstack/react-router'
import {
  ClockIcon,
  EyeIcon,
  MapPinIcon,
  PackageIcon,
  XIcon,
} from 'lucide-react'

type Props = {
  order: SimpleOrder
}

export function OrderCard({ order }: Props) {
  return (
    <Card className="p-0">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">#{order.orderNumber}</span>
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
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-start gap-2">
            <MapPinIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{order.address}</span>
          </div>
          <div className="flex items-start gap-2">
            <ClockIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">
              <FormattedDate date={new Date(order.createdAt)} />
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-sm">
              <Currency value={order.total} currency="COP" />
            </span>
          </div>

          {/* Action buttons */}
          <div className="mt-2 flex justify-end border-t pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-normal"
                asChild
              >
                <Link to="/app/orders/$orderId" params={{ orderId: order.id }}>
                  <EyeIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Ver detalles</span>
                </Link>
              </Button>

              {order.status === OrderStatus.Paid && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-emerald-200 bg-emerald-50 font-normal text-emerald-700 hover:bg-emerald-100"
                >
                  <PackageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Marcar como enviado</span>
                </Button>
              )}

              {order.status === OrderStatus.Pending && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-red-200 bg-red-50 font-normal text-red-700 hover:bg-red-100"
                  >
                    <XIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Cancelar</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
