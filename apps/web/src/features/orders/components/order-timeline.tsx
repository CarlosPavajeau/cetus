import type { Order } from '@cetus/api-client/types/orders'
import { orderStatusLabels } from '@cetus/shared/constants/order'
import { Card } from '@cetus/ui/card'
import { Skeleton } from '@cetus/ui/skeleton'
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDescription,
  TimelineDot,
  TimelineHeader,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
} from '@cetus/ui/timeline'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { orderQueries } from '@cetus/web/features/orders/queries'
import { useQuery } from '@tanstack/react-query'

type Props = {
  order: Order
}

export function OrderTimeline({ order }: Readonly<Props>) {
  const { data, isLoading } = useQuery(orderQueries.timeline(order.id))

  if (isLoading) {
    return (
      <Card className="p-5">
        <h3 className="mb-4 font-semibold">Línea de tiempo del pedido</h3>

        <div className="space-y-1">
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-3/4" />
          <Skeleton className="mb-2 h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Card>
    )
  }

  if (!data?.length) {
    return (
      <Card className="p-5">
        <h3 className="mb-4 font-semibold">Línea de tiempo del pedido</h3>

        <div className="text-muted-foreground text-sm">
          No hay eventos en la línea de tiempo para este pedido.
        </div>
      </Card>
    )
  }

  return (
    <Card className="gap-4 p-5">
      <h3 className="font-semibold">Línea de tiempo del pedido</h3>

      <Timeline activeIndex={data.length - 1} className="gap-2">
        {data.map((event) => (
          <TimelineItem key={event.id}>
            <TimelineDot />
            <TimelineConnector />

            <TimelineContent>
              <TimelineHeader>
                <TimelineTime>
                  <FormattedDate
                    date={new Date(event.createdAt)}
                    options={{
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }}
                  />
                </TimelineTime>

                <TimelineTitle className="font-medium text-sm">
                  {orderStatusLabels[event.toStatus]}
                </TimelineTitle>
              </TimelineHeader>

              <TimelineDescription>{event.notes}</TimelineDescription>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Card>
  )
}
