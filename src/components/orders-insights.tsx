import { useOrderInsights } from '@/hooks/orders'
import { ReceiptIcon, TrendingUpIcon } from 'lucide-react'
import { Currency } from './currency'
import { Badge } from './ui/badge'
import { Skeleton } from './ui/skeleton'

export function OrdersInsights() {
  const { insights, isLoading } = useOrderInsights()

  if (isLoading) {
    return <Skeleton className="h-[20px] w-[300px]" />
  }

  if (!insights) {
    return null
  }

  return (
    <>
      <Badge variant="outline">
        <TrendingUpIcon
          className="-ms-0.5 opacity-60"
          size={12}
          aria-hidden="true"
        />
        Ingresos del mes actual:{' '}
        <Currency value={insights.currentMonthTotal} currency="COP" />
      </Badge>
      <Badge variant="outline">
        <ReceiptIcon
          className="-ms-0.5 opacity-60"
          size={12}
          aria-hidden="true"
        />
        Costo del mes actual:{' '}
        <Currency value={insights.currentMonthCost} currency="COP" />
      </Badge>
    </>
  )
}
