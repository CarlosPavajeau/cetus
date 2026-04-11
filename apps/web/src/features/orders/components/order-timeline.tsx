import type { Order, OrderStatus } from '@cetus/api-client/types/orders'
import {
  orderStatusColors,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Card } from '@cetus/ui/card'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { Skeleton } from '@cetus/ui/skeleton'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { orderQueries } from '@cetus/web/features/orders/queries'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  PackageIcon,
  RotateCcwIcon,
  ShoppingBagIcon,
  TruckIcon,
  XCircleIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'

const statusIcons: Record<OrderStatus, ComponentType<{ className?: string }>> =
  {
    pending_payment: ClockIcon,
    payment_confirmed: CheckCircle2Icon,
    processing: ShoppingBagIcon,
    ready_for_pickup: PackageIcon,
    shipped: TruckIcon,
    delivered: CheckCircle2Icon,
    failed_delivery: XCircleIcon,
    canceled: XCircleIcon,
    returned: RotateCcwIcon,
  }

function StatusBadge({ status }: { status: OrderStatus }) {
  const color = orderStatusColors[status]
  const label = orderStatusLabels[status]
  const Icon = statusIcons[status]

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: color.replace(')', ' / 0.12)'),
        color,
      }}
    >
      <Icon className="size-3 shrink-0" />
      {label}
    </span>
  )
}

type Props = {
  order: Order
}

export function OrderTimeline({ order }: Readonly<Props>) {
  const { data, isLoading } = useQuery(orderQueries.timeline(order.id))

  if (isLoading) {
    return (
      <Card className="gap-4 p-5">
        <p className="font-heading font-medium">
          Historial de estados
        </p>
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-8 w-5/6" />
        </div>
      </Card>
    )
  }

  if (!data?.length) {
    return (
      <Card className="gap-4 p-5">
        <p className="font-heading font-medium">
          Historial de estados
        </p>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClockIcon />
            </EmptyMedia>
            <EmptyTitle>Sin eventos registrados</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </Card>
    )
  }

  return (
    <Card className="gap-4 p-5">
      <p className="font-heading font-medium">
        Historial de estados
      </p>

      <div className="flex flex-col">
        {data.map((event, i) => (
          <div key={event.id} className="flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center pt-1.5">
              <div className="size-2 shrink-0 rounded-full bg-muted-foreground/30" />
              {i < data.length - 1 ? (
                <div className="mt-2 w-px flex-1 bg-border" />
              ) : null}
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {event.fromStatus ? (
                  <>
                    <StatusBadge status={event.fromStatus} />
                    <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" />
                  </>
                ) : null}
                <StatusBadge status={event.toStatus} />
              </div>

              {event.notes ? (
                <p className="text-xs text-muted-foreground">{event.notes}</p>
              ) : null}

              <p className="text-xs text-muted-foreground">
                <FormattedDate
                  date={new Date(event.createdAt)}
                  options={{
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }}
                />
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
