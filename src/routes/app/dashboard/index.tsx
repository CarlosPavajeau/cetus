import { AccessDenied } from '@/components/access-denied'
import { CompleteOrdersChart } from '@/components/order/complete-orders-chart'
import { NewOrdersSummary } from '@/components/order/new-orders-summary'
import { OrdersInsights } from '@/components/order/orders-insights'
import { Protect } from '@clerk/clerk-react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold font-heading text-2xl text-foreground">
            Panel de control
          </h1>

          <div></div>
        </div>

        <OrdersInsights />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <CompleteOrdersChart />

          <NewOrdersSummary />
        </div>
      </div>
    </Protect>
  )
}
