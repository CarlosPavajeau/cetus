import { useSearch } from '@tanstack/react-router'
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { useNumberFormatter } from 'react-aria'
import { Currency } from '@/components/currency'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrderInsights } from '@/hooks/orders'

type InsightCardProps = {
  title: string
  value: string | number | React.ReactNode
  percentageChange?: number
}

export function InsightCard({
  title,
  value,
  percentageChange,
}: Readonly<InsightCardProps>) {
  const percentageFormatter = useNumberFormatter({
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
          {value}
        </CardTitle>

        {percentageChange !== undefined && percentageChange !== 0 && (
          <CardAction>
            <Badge variant="outline">
              {percentageChange > 0 ? (
                <TrendingUpIcon className="text-success-base" />
              ) : (
                <TrendingDownIcon className="text-destructive" />
              )}
              {percentageFormatter.format(percentageChange)}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  )
}

export function OrdersInsights() {
  const { month } = useSearch({
    from: '/app/dashboard/',
  })
  const { insights, isLoading } = useOrderInsights(month as unknown as string)

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
      value: <Currency currency="COP" value={insights.currentMonthTotal} />,
      percentageChange: insights.revenuePercentageChange,
    },
    {
      title: 'Clientes',
      value: insights.customersCount,
      percentageChange: insights.customerPercentageChange,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {insightsData.map((item) => (
        <InsightCard
          key={item.title}
          percentageChange={item.percentageChange}
          title={item.title}
          value={item.value}
        />
      ))}
    </div>
  )
}
