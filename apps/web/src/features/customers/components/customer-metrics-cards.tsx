import type { Customer } from '@cetus/api-client/types/customers'
import { StatsCard } from '@cetus/web/features/reports/components/stats-card'
import { useCallback } from 'react'
import { useNumberFormatter } from 'react-aria'

type Props = {
  customer: Customer
}

function formatFrequency(value: number) {
  if (value === 0) {
    return 'Sin datos'
  }

  if (value === 1) {
    return 'Cada día'
  }

  return `Cada ${value} días`
}

export function CustomerMetricsCards({ customer }: Readonly<Props>) {
  const currencyFormat = useNumberFormatter({
    style: 'currency',
    currency: 'COP',
  })

  const formatCurrency = useCallback(
    (value: number) => currencyFormat.format(value),
    [currencyFormat],
  )

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatsCard title="Total de compras" value={customer.totalPurchases} />

      <StatsCard
        format={formatCurrency}
        title="Total gastado"
        value={customer.totalSpent}
      />

      <StatsCard
        format={formatFrequency}
        title="Frecuencia de compra"
        value={customer.purchaseFrequencyDays ?? 0}
      />
    </div>
  )
}
