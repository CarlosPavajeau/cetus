import { useSearch } from '@tanstack/react-router'
import { ChartNoAxesCombinedIcon } from 'lucide-react'
import { useNumberFormatter } from 'react-aria'
import { OrderStatusText } from '@/api/orders'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrdersSummary } from '@/hooks/orders'

type StatusInsight = {
  label: string
  color: string
  percentage: number
  total: number
}

const PercentageMultiplier = 100

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

  if (!summary || summary.length === 0) {
    return (
      <Card className="@container/card col-span-4 lg:col-span-3">
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartNoAxesCombinedIcon />
              </EmptyMedia>
              <EmptyTitle>No hay pedidos</EmptyTitle>
              <EmptyDescription>
                No tienes pedidos registrados.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  const ordersCount = summary.length
  const pendingOrders = summary.filter(
    (order) => order.status === 'pending',
  ).length
  const paidOrders = summary.filter((order) => order.status === 'paid').length
  const shippedOrders = summary.filter(
    (order) => order.status === 'delivered',
  ).length
  const canceledOrders = summary.filter(
    (order) => order.status === 'canceled',
  ).length

  const pendingOrdersPercentage =
    (pendingOrders / ordersCount) * PercentageMultiplier
  const paidOrdersPercentage = (paidOrders / ordersCount) * PercentageMultiplier
  const shippedOrdersPercentage =
    (shippedOrders / ordersCount) * PercentageMultiplier
  const canceledOrdersPercentage =
    (canceledOrders / ordersCount) * PercentageMultiplier

  const statusInsights: StatusInsight[] = [
    {
      label: OrderStatusText.pending,
      color: 'bg-warning-base',
      percentage: pendingOrdersPercentage,
      total: pendingOrders,
    },
    {
      label: OrderStatusText.paid,
      color: 'bg-success-base',
      percentage: paidOrdersPercentage,
      total: paidOrders,
    },
    {
      label: OrderStatusText.delivered,
      color: 'bg-success-dark',
      percentage: shippedOrdersPercentage,
      total: shippedOrders,
    },
    {
      label: OrderStatusText.canceled,
      color: 'bg-destructive',
      percentage: canceledOrdersPercentage,
      total: canceledOrders,
    },
  ]

  return (
    <Card className="@container/card col-span-4 lg:col-span-3">
      <CardHeader>
        <CardTitle>Estado de los pedidos</CardTitle>
        <CardDescription>{ordersCount} pedidos en total</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3">
        <div className="flex flex-col gap-5">
          <div className="flex gap-[5px]">
            {statusInsights.map((status, index) => (
              <div
                className={`${status.color} h-2 rounded-xs`}
                key={`${status.label}-${index}`}
                style={{
                  width: `${status.percentage}%`,
                  display: status.percentage > 0 ? 'block' : 'none',
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {statusInsights.map((status, index) => (
              <div
                className="flex items-center gap-2"
                key={`${status.label}-${index}`}
              >
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

        <Separator className="my-1" />

        <table cellPadding={0} className="w-full">
          <thead className="text-left">
            <tr className="text-muted-foreground text-xs">
              <th>Estado</th>
              <th>Porcentaje</th>
              <th className="w-12">Total</th>
            </tr>
          </thead>
          <tbody aria-hidden="true" className="h-2" />
          <tbody>
            {statusInsights.map((status, index) => (
              <tr className="text-sm" key={`${status.label}-${index}`}>
                <td className="flex items-center gap-2 py-1">
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${status.color}`}
                  />
                  <span>{status.label}</span>
                </td>
                <td>
                  {percentageFormatter.format(
                    status.percentage / PercentageMultiplier,
                  )}
                </td>
                <td>{status.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
