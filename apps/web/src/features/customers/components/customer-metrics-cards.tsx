import type { Customer } from '@cetus/api-client/types/customers'
import { StatsCard } from '@cetus/web/features/reports/components/stats-card'

type Props = {
  customer: Customer
}

export function CustomerMetricsCards({ customer }: Readonly<Props>) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatsCard title="Total de compras" value={customer.totalPurchases} />

      <StatsCard
        format="currency"
        title="Total gastado"
        value={customer.totalSpent}
      />

      <StatsCard
        format="number"
        title="Frecuencia de compra (días)"
        value={customer.purchaseFrequencyDays ?? 0}
      />
    </div>
  )
}
