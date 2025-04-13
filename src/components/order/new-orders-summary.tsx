import { OrderStatus, OrderStatusText } from '@/api/orders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrders } from '@/hooks/orders'

type StatusInsight = {
  label: string
  color: string
  percentage: number
  total: number
}

export function NewOrdersSummary() {
  const { isLoading, orders } = useOrders()

  if (isLoading) {
    return (
      <div className="col-span-4 lg:col-span-3">
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!orders) {
    return null
  }

  const ordersCount = orders.length
  const pendingOrders = orders.filter(
    (order) => order.status === OrderStatus.Pending,
  ).length
  const paidOrders = orders.filter(
    (order) => order.status === OrderStatus.Paid,
  ).length
  const shippedOrders = orders.filter(
    (order) => order.status === OrderStatus.Delivered,
  ).length
  const canceledOrders = orders.filter(
    (order) => order.status === OrderStatus.Canceled,
  ).length

  const pendingOrdersPercentage = (pendingOrders / ordersCount) * 100
  const paidOrdersPercentage = (paidOrders / ordersCount) * 100
  const shippedOrdersPercentage = (shippedOrders / ordersCount) * 100
  const canceledOrdersPercentage = (canceledOrders / ordersCount) * 100

  const statusInsights: StatusInsight[] = [
    {
      label: OrderStatusText[OrderStatus.Pending],
      color: 'bg-amber-500',
      percentage: pendingOrdersPercentage,
      total: pendingOrders,
    },
    {
      label: OrderStatusText[OrderStatus.Paid],
      color: 'bg-emerald-500',
      percentage: paidOrdersPercentage,
      total: paidOrders,
    },
    {
      label: OrderStatusText[OrderStatus.Delivered],
      color: 'bg-emerald-700',
      percentage: shippedOrdersPercentage,
      total: shippedOrders,
    },
    {
      label: OrderStatusText[OrderStatus.Canceled],
      color: 'bg-destructive',
      percentage: canceledOrdersPercentage,
      total: canceledOrders,
    },
  ]

  return (
    <Card className="col-span-4 overflow-hidden rounded-md py-0 lg:col-span-3">
      <CardHeader className="px-6 pt-6 pb-0">
        <CardTitle>Pedidos</CardTitle>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            {statusInsights.map((status, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-xs ${status.color}`}
                ></div>
                <div className="text-[13px]/3 text-muted-foreground/50">
                  {status.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex h-5 gap-1">
          {statusInsights.map((status, index) => (
            <div
              key={index}
              className={`h-full ${status.color}`}
              style={{ width: `${status.percentage}%` }}
            ></div>
          ))}
        </div>

        <div>
          <div className="mb-3 text-[13px]/3 text-muted-foreground/50">
            Estado de los pedidos
          </div>
          <ul className="divide-y divide-border text-sm">
            {statusInsights.map((status, index) => (
              <li key={index} className="flex items-center gap-2 py-2">
                <span
                  className={`size-2 shrink-0 rounded-full ${status.color}`}
                  aria-hidden="true"
                ></span>
                <span className="grow text-muted-foreground">
                  {status.label}
                </span>
                <span className="font-medium text-[13px]/3 text-foreground/70">
                  {status.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
