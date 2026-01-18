import type { Order } from '@cetus/api-client/types/orders'
import { orderStatusLabels } from '@cetus/shared/constants/order'
import { Card } from '@cetus/ui/card'
import { Skeleton } from '@cetus/ui/skeleton'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { orderQueries } from '@cetus/web/features/orders/queries'
import { useQuery } from '@tanstack/react-query'
import { StickyNoteIcon } from 'lucide-react'

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

  return (
    <Card className="gap-4 p-5">
      <h3 className="font-semibold">Línea de tiempo del pedido</h3>

      <div className="relative">
        <div className="absolute top-2 bottom-2 left-1.75 w-0.5 bg-linear-to-b from-blue-400 via-blue-300 to-blue-200" />
        <div className="space-y-2">
          {data &&
            data.length > 0 &&
            data.map((event) => (
              <div className="group relative flex gap-4" key={event.id}>
                <div className="relative z-10 shrink-0">
                  <div className="h-4 w-4 rounded-full bg-blue-500 ring-3 ring-blue-500" />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground text-sm">
                      {orderStatusLabels[event.toStatus]}
                    </span>

                    <span className="text-muted-foreground text-xs">
                      <FormattedDate
                        date={new Date(event.createdAt)}
                        options={{
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }}
                      />
                    </span>

                    {event.notes && (
                      <div className="flex items-center gap-2">
                        <StickyNoteIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground text-xs">
                          {event.notes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>

        {data?.length === 0 && (
          <div className="text-muted-foreground text-sm">
            No hay eventos en la línea de tiempo para este pedido.
          </div>
        )}
      </div>
    </Card>
  )
}
