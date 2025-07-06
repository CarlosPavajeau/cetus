import { Currency } from '@/components/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrderInsights } from '@/hooks/orders'
import { cn } from '@/shared/cn'
import { useOrganization } from '@clerk/tanstack-react-start'
import { useSearch } from '@tanstack/react-router'
import { useNumberFormatter } from 'react-aria'

type InsightCardProps = {
  title: string
  value: string | number | React.ReactNode
  percentageChange?: number
}

export function InsightCard({
  title,
  value,
  percentageChange,
}: InsightCardProps) {
  const percentageFormatter = useNumberFormatter({
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  })

  return (
    <Card className="w-full gap-0 overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="mt-1 flex items-center gap-1.5">
        <span className="font-medium text-2xl">{value}</span>
        {percentageChange !== undefined && percentageChange !== 0 && (
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
        )}
      </CardContent>
    </Card>
  )
}

export function OrdersInsights() {
  const { month } = useSearch({
    from: '/app/dashboard/',
  })
  const org = useOrganization()

  const { insights, isLoading } = useOrderInsights(
    month,
    org.organization?.slug ?? undefined,
  )

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
      percentageChange: insights.ordersCountPercentageChange,
    },
    {
      title: 'Ingresos del mes',
      value: <Currency value={insights.currentMonthTotal} currency="COP" />,
      percentageChange: insights.revenuePercentageChange,
    },
    {
      title: 'Costo del mes',
      value: <Currency value={insights.currentMonthCost} currency="COP" />,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {insightsData.map((item) => (
        <InsightCard
          key={item.title}
          title={item.title}
          value={item.value}
          percentageChange={item.percentageChange}
        />
      ))}
    </div>
  )
}
