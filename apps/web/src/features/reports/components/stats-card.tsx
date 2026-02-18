import { Badge } from '@cetus/ui/badge'
import { Card, CardContent } from '@cetus/ui/card'
import { CountingNumber } from '@cetus/ui/counting-number'
import { cn } from '@cetus/web/shared/utils'
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { useCallback } from 'react'
import { useNumberFormatter } from 'react-aria'

type FormatOptions = 'currency' | 'number' | 'percentage'

type Props = {
  title: string
  value: string | number
  className?: string
  format?: FormatOptions
  percentageChange?: number | null
}

const formats: Record<FormatOptions, Intl.NumberFormatOptions> = {
  currency: {
    style: 'currency',
    currency: 'COP',
  },
  number: {
    style: 'decimal',
    maximumFractionDigits: 2,
  },
  percentage: {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  },
} as const

export function StatsCard({
  title,
  value,
  format = 'number',
  className,
  percentageChange,
}: Props) {
  const numValue = typeof value === 'number' ? value : Number.parseFloat(value)

  const formatOptions = formats[format]
  const valueFormatter = useNumberFormatter(formatOptions)
  const formatValue = useCallback(
    (value: number) => valueFormatter.format(value),
    [valueFormatter],
  )

  const percentageFormatter = useNumberFormatter({
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  })

  return (
    <Card className={cn('w-full', className)}>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-muted-foreground text-sm">{title}</p>
            <p className="mt-1 font-bold font-mono text-3xl">
              <CountingNumber
                duration={0.5}
                format={formatValue}
                from={0}
                to={Number.isNaN(numValue) ? 0 : numValue}
              />
            </p>
          </div>
          {percentageChange === null && (
            <Badge variant="outline">
              <span className="text-muted-foreground">—</span>
            </Badge>
          )}
          {percentageChange != null && percentageChange !== 0 && (
            <Badge variant="outline">
              {percentageChange > 0 ? (
                <TrendingUpIcon className="text-success-base" />
              ) : (
                <TrendingDownIcon className="text-destructive" />
              )}
              {percentageFormatter.format(percentageChange)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
