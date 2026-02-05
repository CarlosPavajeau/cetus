import type { OrderStatus } from '@cetus/api-client/types/orders'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@cetus/ui/empty'
import { Button } from '@cetus/web/components/ui/button'
import { Skeleton } from '@cetus/web/components/ui/skeleton'
import { orderQueries } from '@cetus/web/features/orders/queries'
import { DailySaleCard } from '@cetus/web/features/reports/components/daily-sale-card'
import { useQuery } from '@tanstack/react-query'
import { parseAsString, useQueryState } from 'nuqs'
import { useMemo, useState } from 'react'

type SalesFilter = 'all' | 'paid' | 'pending'

const paidStatuses: Set<OrderStatus> = new Set([
  'payment_confirmed',
  'processing',
  'ready_for_pickup',
  'shipped',
  'delivered',
])

function isPaid(status: OrderStatus) {
  return paidStatuses.has(status)
}

export function DailySalesList() {
  const [dateParam] = useQueryState('date', parseAsString)
  const [filter, setFilter] = useState<SalesFilter>('all')

  const dateStr = dateParam ?? new Date().toISOString().slice(0, 10)

  const { data, isLoading } = useQuery(
    orderQueries.list({ from: dateStr, to: dateStr, pageSize: 100 }),
  )

  const orders = data?.items ?? []

  const filteredOrders = useMemo(() => {
    if (filter === 'all') {
      return orders
    }
    if (filter === 'paid') {
      return orders.filter((o) => isPaid(o.status))
    }
    return orders.filter((o) => o.status === 'pending_payment')
  }, [orders, filter])

  const filters: { key: SalesFilter; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'paid', label: 'Pagadas' },
    { key: 'pending', label: 'Pendientes' },
  ]

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-medium text-lg">
          Ventas del día
          {!isLoading && (
            <span className="ml-1.5 text-muted-foreground text-sm">
              ({filteredOrders.length})
            </span>
          )}
        </h2>
      </div>

      <div className="flex gap-1.5">
        {filters.map((f) => (
          <Button
            key={f.key}
            onClick={() => setFilter(f.key)}
            size="xs"
            variant={filter === f.key ? 'secondary' : 'outline'}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && filteredOrders.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin ventas</EmptyTitle>
            <EmptyDescription>
              ¡Registra tu primera venta del día!
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!isLoading && filteredOrders.length > 0 && (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <DailySaleCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </section>
  )
}
