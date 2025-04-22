import { Currency } from '@/components/currency'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrderInsights } from '@/hooks/orders'
import { useSearch } from '@tanstack/react-router'
import {
  DollarSignIcon,
  type LucideIcon,
  PackageIcon,
  ReceiptIcon,
  ShoppingCartIcon,
} from 'lucide-react'

type InsightCardProps = {
  title: string
  value: string | number | React.ReactNode
  icon: LucideIcon
}

export function InsightCard({ title, value, icon }: InsightCardProps) {
  const CardIcon = icon as LucideIcon
  return (
    <Card className="overflow-hidden rounded-md py-0">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 max-[480px]:hidden dark:bg-primary">
          <CardIcon className="size-5 text-primary dark:text-primary-foreground" />
        </div>

        <div>
          <p className="font-medium text-muted-foreground text-sm">{title}</p>
          <p className="font-semibold text-2xl">{value}</p>
        </div>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[100px] w-full" />
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
      icon: PackageIcon,
    },
    {
      title: 'Pedidos completados',
      value: insights.completedOrdersCount,
      icon: ShoppingCartIcon,
    },
    {
      title: 'Ingresos del mes',
      value: <Currency value={insights.currentMonthTotal} currency="COP" />,
      icon: DollarSignIcon,
    },
    {
      title: 'Costo del mes',
      value: <Currency value={insights.currentMonthCost} currency="COP" />,
      icon: ReceiptIcon,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {insightsData.map((item) => (
        <InsightCard
          key={item.title}
          title={item.title}
          value={item.value}
          icon={item.icon}
        />
      ))}
    </div>
  )
}
