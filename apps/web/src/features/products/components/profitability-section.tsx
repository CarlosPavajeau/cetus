import { Currency } from '@cetus/web/components/currency'
import { useNumberFormatter } from 'react-aria'

const MarginThresholds = {
  healthy: 30,
  tight: 15,
} as const

function getProfitabilityIndicator(margin: number): {
  label: string
  className: string
  barColor: string
} {
  if (margin <= 0) {
    return {
      label: 'Sin ganancia',
      className: 'text-red-600',
      barColor: 'bg-red-500',
    }
  }
  if (margin < MarginThresholds.tight) {
    return {
      label: 'Margen bajo',
      className: 'text-orange-600',
      barColor: 'bg-orange-500',
    }
  }
  if (margin < MarginThresholds.healthy) {
    return {
      label: 'Margen ajustado',
      className: 'text-yellow-600',
      barColor: 'bg-yellow-500',
    }
  }
  return {
    label: 'Margen saludable',
    className: 'text-green-600',
    barColor: 'bg-green-500',
  }
}

type Props = {
  costPrice?: number | string
  price?: number | string
}

export function ProfitabilitySection({ costPrice, price }: Props) {
  const cost = Number(costPrice)
  const sell = Number(price)
  const percentageFormat = useNumberFormatter({
    style: 'percent',
    maximumFractionDigits: 2,
  })

  if (!(costPrice && Number.isFinite(cost)) || cost <= 0) {
    return null
  }

  if (!(price && Number.isFinite(sell)) || sell <= 0) {
    return null
  }

  const profit = sell - cost
  const margin = (profit / sell) * 100
  const clampedMargin = Math.min(Math.max(margin, 0), 100)
  const { label, className, barColor } = getProfitabilityIndicator(margin)

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Rentabilidad
        </span>
        <span className={`font-semibold text-xs ${className}`}>{label}</span>
      </div>

      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${clampedMargin}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-muted-foreground text-xs">Ganancia</p>
          <p className="font-semibold text-sm tabular-nums">
            <Currency currency="COP" value={profit} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Margen</p>
          <p className="font-semibold text-sm tabular-nums">
            {percentageFormat.format(margin / 100)}
          </p>
        </div>
      </div>
    </div>
  )
}
