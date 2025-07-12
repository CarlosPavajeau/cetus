import { AccessDenied } from '@/components/access-denied'
import { CompleteOrdersChart } from '@/components/order/complete-orders-chart'
import { NewOrdersSummary } from '@/components/order/new-orders-summary'
import { OrdersInsights } from '@/components/order/orders-insights'
import { TopSellingProducts } from '@/components/product/top-selling-products'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MONTHS } from '@/shared/constants'
import { Protect } from '@clerk/tanstack-react-start'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { type } from 'arktype'

const months = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const

type Month = (typeof months)[number]

const DashboardSearchSchema = type({
  month: type.valueOf(months).default(() => {
    return new Date()
      .toLocaleString('default', { month: 'long' })
      .toLocaleLowerCase() as unknown as Month
  }),
})

export const Route = createFileRoute('/app/dashboard/')({
  component: RouteComponent,
  validateSearch: DashboardSearchSchema,
})

function RouteComponent() {
  const { month } = Route.useSearch()

  const navigate = useNavigate()
  const handleMonthChange = (month: Month) => {
    navigate({ to: '/app/dashboard', search: { month } })
  }

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading font-semibold text-2xl">
          Panel de control
        </h1>

        <div>
          <Select
            onValueChange={handleMonthChange}
            defaultValue={month as unknown as string}
            value={month as unknown as string}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Selecciona un mes" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem
                  key={month.value}
                  value={month.value}
                  className="pe-8 text-xs"
                >
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <OrdersInsights />

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <CompleteOrdersChart />

        <NewOrdersSummary />

        <TopSellingProducts />
      </div>
    </Protect>
  )
}
