import { OrderStatus } from '@/api/orders'
import { useOrders } from '@/hooks/user-orders'
import { DefaultLoader } from './default-loader'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function NewOrdersSummary() {
  const { isLoading, orders } = useOrders()

  if (isLoading) {
    return <DefaultLoader />
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

  return (
    <Card className="gap-5">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle>Nuevas ordenes</CardTitle>
            <div className="flex items-start gap-2">
              <div className="font-semibold text-2xl">{orders.length}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-amber-500"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Pendiente
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-emerald-500"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Pagada
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-emerald-700"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Enviada
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-destructive"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Cancelada
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex h-5 gap-1">
          <div
            className="h-full bg-amber-500"
            style={{ width: `${pendingOrdersPercentage}%` }}
          ></div>
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${paidOrdersPercentage}%` }}
          ></div>
          <div
            className="h-full bg-emerald-700"
            style={{ width: `${shippedOrdersPercentage}%` }}
          ></div>
          <div
            className="h-full bg-destructive"
            style={{ width: `${canceledOrdersPercentage}%` }}
          ></div>
        </div>

        <div>
          <div className="mb-3 text-[13px]/3 text-muted-foreground/50">
            Estado de las ordenes
          </div>
          <ul className="divide-y divide-border text-sm">
            <li className="flex items-center gap-2 py-2">
              <span
                className="size-2 shrink-0 rounded-full bg-amber-500"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">Pendiente</span>
              <span className="font-medium text-[13px]/3 text-foreground/70">
                {pendingOrders}
              </span>
            </li>
            <li className="flex items-center gap-2 py-2">
              <span
                className="size-2 shrink-0 rounded-full bg-emerald-500"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">Pagada</span>
              <span className="font-medium text-[13px]/3 text-foreground/70">
                {paidOrders}
              </span>
            </li>
            <li className="flex items-center gap-2 py-2">
              <span
                className="size-2 shrink-0 rounded-full bg-emerald-700"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">Enviada</span>
              <span className="font-medium text-[13px]/3 text-foreground/70">
                {shippedOrders}
              </span>
            </li>
            <li className="flex items-center gap-2 py-2">
              <span
                className="size-2 shrink-0 rounded-full bg-destructive"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">Cancelada</span>
              <span className="font-medium text-[13px]/3 text-foreground/70">
                {canceledOrders}
              </span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
