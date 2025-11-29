import type { SimpleOrder } from '@cetus/api-client/types/orders'
import {
  orderStatusBadgeVariants,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Badge, BadgeDot } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { Card, CardContent } from '@cetus/ui/card'
import { Currency } from '@cetus/web/components/currency'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { Link } from '@tanstack/react-router'
import { ClockIcon, EyeIcon, MapPinIcon } from 'lucide-react'

type Props = {
  order: SimpleOrder
}

export function OrderCard({ order }: Readonly<Props>) {
  return (
    <Card className="p-0">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">#{order.orderNumber}</span>
            <Badge
              appearance="outline"
              size="sm"
              variant={orderStatusBadgeVariants[order.status]}
            >
              <BadgeDot />
              {orderStatusLabels[order.status]}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-start gap-2">
            <MapPinIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {order.address} - {order.city}, {order.state}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ClockIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">
              <FormattedDate date={new Date(order.createdAt)} />
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-sm">
              <Currency currency="COP" value={order.total} />
            </span>
          </div>

          <div className="mt-4 flex justify-end border-t pt-4">
            <div className="flex items-center gap-2">
              <Button
                asChild
                className="gap-1.5 font-normal"
                size="sm"
                variant="outline"
              >
                <Link params={{ orderId: order.id }} to="/app/orders/$orderId">
                  <EyeIcon />
                  <span>Ver detalles</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
