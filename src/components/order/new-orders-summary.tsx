import { OrderStatus, OrderStatusText } from '@/api/orders'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrdersSummary } from '@/hooks/orders'
import { cn } from '@/shared/cn'
import { useSearch } from '@tanstack/react-router'
import { useNumberFormatter } from 'react-aria'

type StatusInsight = {
  label: string
  color: string
  percentage: number
  total: number
}

export function NewOrdersSummary() {
  const { month } = useSearch({
    from: '/app/dashboard/',
  })
  const { isLoading, summary } = useOrdersSummary(month)

  const percentageFormatter = useNumberFormatter({
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'auto',
  })

  if (isLoading) {
    return (
      <div className="col-span-4 lg:col-span-3">
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!summary) {
    return null
  }

  if (summary.length === 0) {
    return (
      <Card className="col-span-4 overflow-hidden rounded-md py-0 lg:col-span-3">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  const ordersCount = summary.length
  const pendingOrders = summary.filter(
    (order) => order.status === OrderStatus.Pending,
  ).length
  const paidOrders = summary.filter(
    (order) => order.status === OrderStatus.Paid,
  ).length
  const shippedOrders = summary.filter(
    (order) => order.status === OrderStatus.Delivered,
  ).length
  const canceledOrders = summary.filter(
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

  const mainStatPercentage = paidOrdersPercentage / 100
  const percentageChange = -0.004

  return (
    <Card className="col-span-4 gap-2 overflow-hidden bg-card py-0 lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-0">
        <CardTitle>Pedidos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pb-6">
        <div>
          <div className="flex items-end gap-2">
            <span className="font-bold text-4xl text-foreground">
              {percentageFormatter.format(mainStatPercentage)}
            </span>
            <Badge
              variant="default"
              className={cn(
                percentageChange > 0
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {percentageFormatter.format(percentageChange)}
            </Badge>
          </div>

          <small className="text-muted-foreground text-xs">
            Porcentaje de pedidos completados.
          </small>
        </div>

        <div className="flex gap-1 overflow-hidden">
          {statusInsights.map((status, index) => (
            <div
              key={index}
              className={`${status.color} h-2 rounded-sm`}
              style={{
                width: `${status.percentage}%`,
                display: status.percentage > 0 ? 'block' : 'none',
              }}
            ></div>
          ))}
        </div>
        <div className="mb-2 flex items-center gap-6">
          {statusInsights.map((status, index) => (
            <div key={index} className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${status.color}`}
                aria-hidden="true"
              ></span>
              <span className="text-muted-foreground text-xs">
                {status.label}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-muted/30 p-4">
          <div className="mb-2 flex font-semibold text-muted-foreground text-xs">
            <div className="w-1/2">Estado</div>
            <div className="w-1/4 text-right">Porcentaje</div>
            <div className="w-1/4 text-right">Total</div>
          </div>
          <ul>
            {statusInsights.map((status, index) => (
              <li key={index} className="flex items-center py-1 text-sm">
                <div className="flex w-1/2 items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${status.color}`}
                    aria-hidden="true"
                  ></span>
                  <span>{status.label}</span>
                </div>
                <div className="w-1/4 text-right">
                  {percentageFormatter.format(status.percentage / 100)}
                </div>
                <div className="w-1/4 text-right">{status.total}</div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
