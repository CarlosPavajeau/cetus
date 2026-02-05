import type { SimpleOrder } from '@cetus/api-client/types/orders'
import {
  orderStatusColors,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Badge } from '@cetus/ui/badge'
import { Card } from '@cetus/ui/card'
import { Currency } from '@cetus/web/components/currency'
import { Link } from '@tanstack/react-router'
import { ChevronRightIcon, MapPinIcon } from 'lucide-react'
import { useDateFormatter } from 'react-aria'

type Props = {
  order: SimpleOrder
}

export function DailySaleCard({ order }: Readonly<Props>) {
  const timeFormatter = useDateFormatter({ hour: 'numeric', minute: 'numeric' })
  const statusColor = orderStatusColors[order.status]

  return (
    <Card className="p-0 transition-colors hover:bg-muted/50">
      <Link
        className="flex items-center gap-4 p-4"
        params={{ orderId: order.id }}
        to="/app/orders/$orderId"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">#{order.orderNumber}</span>
            <Badge
              className="border-transparent"
              style={{
                backgroundColor: statusColor.replace(')', ' / 0.15)'),
                color: statusColor,
              }}
            >
              {orderStatusLabels[order.status]}
            </Badge>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
              <MapPinIcon className="size-3 shrink-0" />
              {order.city}, {order.state} &middot;{' '}
              {timeFormatter.format(new Date(order.createdAt))}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="font-semibold text-sm">
            <Currency currency="COP" value={order.total} />
          </span>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </div>
      </Link>
    </Card>
  )
}
