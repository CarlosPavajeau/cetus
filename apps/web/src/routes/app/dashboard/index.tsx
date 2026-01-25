import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import { CompleteOrdersChart } from '@cetus/web/features/orders/components/complete-orders-chart'
import { NewOrdersSummary } from '@cetus/web/features/orders/components/new-orders-summary'
import { OrdersInsights } from '@cetus/web/features/orders/components/orders-insights'
import { TopSellingProducts } from '@cetus/web/features/products/components/top-selling-products'
import { MONTHS } from '@cetus/web/shared/constants'
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
  month: type
    .valueOf(months)
    .default(
      () =>
        new Date()
          .toLocaleString('en', { month: 'long' })
          .toLocaleLowerCase() as unknown as Month,
    ),
})

export const Route = createFileRoute('/app/dashboard/')({
  component: RouteComponent,
  validateSearch: DashboardSearchSchema,
})

function RouteComponent() {
  const { month } = Route.useSearch()

  const navigate = useNavigate()
  const handleMonthChange = (selectedMonth: Month) => {
    navigate({ to: '/app/dashboard', search: { month: selectedMonth } })
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <Select
          defaultValue={month as unknown as string}
          onValueChange={handleMonthChange}
          value={month as unknown as string}
        >
          <SelectTrigger className="w-full max-w-48">
            <SelectValue placeholder="Selecciona un mes" />
          </SelectTrigger>
          <SelectContent position="popper">
            {MONTHS.map((monthOption) => (
              <SelectItem key={monthOption.value} value={monthOption.value}>
                {monthOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OrdersInsights />

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <CompleteOrdersChart />

        <NewOrdersSummary />

        <TopSellingProducts />
      </div>
    </div>
  )
}
