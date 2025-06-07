import { Currency } from '@/components/currency'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrderInsights } from '@/hooks/orders'
import { cn } from '@/shared/cn'
import { useSearch } from '@tanstack/react-router'
import { useNumberFormatter } from 'react-aria'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

type InsightCardProps = {
  title: string
  value: string | number | React.ReactNode
}

export function InsightCard({ title, value }: InsightCardProps) {
  const percentageFormatter = useNumberFormatter({
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  })

  // TODO: calculate percentage change
  const percentageChange = Math.random() * 0.01 - 0.005

  return (
    <Card className="w-full gap-0 overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="mt-1 flex items-center gap-1.5">
        <span className="font-medium text-2xl">{value}</span>
        <span className="text-muted-foreground text-xs">
          <span
            className={cn(
              percentageChange > 0 ? 'text-success-base' : 'text-destructive',
            )}
          >
            {percentageFormatter.format(percentageChange)}
          </span>{' '}
          vs mes anterior
        </span>
      </CardContent>
    </Card>
  )
}

export function OrdersInsights() {
  const { month } = useSearch({
    from: '/app/dashboard/',
  })

  const { insights, isLoading } = useOrderInsights(month)

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
      </div>
    )
  }

  if (!insights) {
    return null
  }

  const insightsData = [
    {
      title: 'Pedidos',
      value: insights.allOrdersCount,
    },
    {
      title: 'Ingresos del mes',
      value: <Currency value={insights.currentMonthTotal} currency="COP" />,
    },
    {
      title: 'Costo del mes',
      value: <Currency value={insights.currentMonthCost} currency="COP" />,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {insightsData.map((item) => (
        <InsightCard key={item.title} title={item.title} value={item.value} />
      ))}
    </div>
  )
}
