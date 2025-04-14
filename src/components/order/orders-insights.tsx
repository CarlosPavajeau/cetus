import { Currency } from '@/components/currency'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrderInsights } from '@/hooks/orders'
import { useSearch } from '@tanstack/react-router'
import {
  DollarSignIcon,
  PackageIcon,
  ReceiptIcon,
  ShoppingCartIcon,
} from 'lucide-react'

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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden rounded-md py-0">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <PackageIcon className="h-6 w-6 text-primary" />
          </div>

          <div>
            <p className="font-medium text-muted-foreground text-sm">Pedidos</p>
            <p className="font-semibold text-2xl">{insights.allOrdersCount}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-md py-0">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShoppingCartIcon className="h-6 w-6 text-primary" />
          </div>

          <div>
            <p className="font-medium text-muted-foreground text-sm">
              Pedidos completados
            </p>
            <p className="font-semibold text-2xl">
              {insights.completedOrdersCount}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-md py-0">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <DollarSignIcon className="h-6 w-6 text-primary" />
          </div>

          <div>
            <p className="font-medium text-muted-foreground text-sm">
              Ingresos del mes
            </p>
            <p className="font-semibold text-2xl">
              <Currency value={insights.currentMonthTotal} currency="COP" />
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-md py-0">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ReceiptIcon className="h-6 w-6 text-primary" />
          </div>

          <div>
            <p className="font-medium text-muted-foreground text-sm">
              Costo del mes
            </p>
            <p className="font-semibold text-2xl">
              <Currency value={insights.currentMonthCost} currency="COP" />
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
