import type { MonthlyProfitabilityResponse } from '@cetus/api-client/types/reports'
import { ProductsWithoutCostAlert } from './products-without-cost-alert'
import { ProfitabilityTrendChart } from './profitability-trend-chart'
import { StatsCard } from './stats-card'

type Props = {
  data: MonthlyProfitabilityResponse
}

export function ProfitabilityContent({ data }: Readonly<Props>) {
  const {
    summary,
    previousMonthComparison: comparison,
    trend,
    productsWithoutCost,
  } = data

  const currencyFormat = {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  } satisfies Intl.NumberFormatOptions

  const percentageFormat = {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  } satisfies Intl.NumberFormatOptions

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          format="currency"
          percentageChange={comparison ? comparison.salesChange : null}
          title="Ventas totales"
          value={summary.totalSales}
        />
        <StatsCard
          format="currency"
          title="Costo total"
          value={summary.totalCost}
        />
        <StatsCard
          format="currency"
          percentageChange={comparison ? comparison.profitChange : null}
          title="Ganancia bruta"
          value={summary.grossProfit}
        />
        <StatsCard
          format="percentage"
          percentageChange={comparison ? comparison.marginChange : null}
          title="Margen"
          value={summary.marginPercentage}
        />
      </div>

      {productsWithoutCost.length > 0 && (
        <ProductsWithoutCostAlert products={productsWithoutCost} />
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-0">
          <h2 className="font-heading font-medium text-lg">
            Tendencia de rentabilidad
          </h2>
          <span className="text-muted-foreground text-xs">Últimos 6 meses</span>
        </div>
        <ProfitabilityTrendChart trend={trend} />
      </section>
    </>
  )
}
