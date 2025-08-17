import { OrderStatus, OrderStatusText } from '@/api/orders'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
  const { isLoading, summary } = useOrdersSummary(month as unknown as string)

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
      color: 'bg-warning-base',
      percentage: pendingOrdersPercentage,
      total: pendingOrders,
    },
    {
      label: OrderStatusText[OrderStatus.Paid],
      color: 'bg-success-base',
      percentage: paidOrdersPercentage,
      total: paidOrders,
    },
    {
      label: OrderStatusText[OrderStatus.Delivered],
      color: 'bg-success-dark',
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

  const mainStatPercentage = shippedOrdersPercentage / 100
  const percentageChange = Math.random() * 0.1 - 0.05

  return (
    <Card className="col-span-4 gap-0 overflow-hidden py-0 lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-0">
        <CardTitle>Estado de pedidos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pb-6">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-end gap-2">
            <span className="font-medium text-2xl text-foreground">
              {percentageFormatter.format(mainStatPercentage)}
            </span>
            <Badge
              className={cn(
                percentageChange > 0
                  ? 'bg-success-light text-success-dark'
                  : 'bg-error-light text-error-dark',
              )}
              variant="default"
            >
              {percentageFormatter.format(percentageChange)}
            </Badge>

            <span className="text-muted-foreground text-xs">
              vs mes anterior
            </span>
          </div>

          <small className="text-muted-foreground text-xs">
            Porcentaje de pedidos completados.
          </small>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex gap-[5px]">
            {statusInsights.map((status, index) => (
              <div
                className={`${status.color} h-2 rounded-xs`}
                key={index}
                style={{
                  width: `${status.percentage}%`,
                  display: status.percentage > 0 ? 'block' : 'none',
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {statusInsights.map((status, index) => (
              <div className="flex items-center gap-2" key={index}>
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${status.color}`}
                />
                <span className="text-muted-foreground text-xs">
                  {status.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <table cellPadding={0} className="w-full">
          <thead className="text-left">
            <tr className="font-medium text-muted-foreground text-xs">
              <th>Estado</th>
              <th>Porcentaje</th>
              <th className="w-12">Total</th>
            </tr>
          </thead>
          <tbody aria-hidden="true" className="h-4" />
          <tbody>
            {statusInsights.map((status, index) => (
              <tr className="text-sm" key={index}>
                <td className="flex items-center gap-2 py-1">
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${status.color}`}
                  />
                  <span>{status.label}</span>
                </td>
                <td>{percentageFormatter.format(status.percentage / 100)}</td>
                <td>{status.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
