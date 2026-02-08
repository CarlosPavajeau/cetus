import { Button } from '@cetus/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { Skeleton } from '@cetus/ui/skeleton'
import { useCustomerOrders } from '@cetus/web/features/customers/hooks/use-customer-orders'
import { OrderCard } from '@cetus/web/features/orders/components/order-card'
import { ChevronLeftIcon, ChevronRightIcon, PackageXIcon } from 'lucide-react'
import { useState } from 'react'

type Props = {
  customerId: string
}

export function CustomerOrdersSection({ customerId }: Readonly<Props>) {
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useCustomerOrders(customerId, {
    page,
    pageSize,
  })

  const orders = data?.items ?? []
  const totalPages = data?.totalPages ?? 0
  const hasNextPage = page < totalPages
  const hasPreviousPage = page > 1

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton className="h-18 w-full rounded-md" key={i} />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageXIcon />
          </EmptyMedia>
          <EmptyTitle>Sin pedidos</EmptyTitle>
          <EmptyDescription>
            Este cliente aún no tiene pedidos registrados.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg tracking-tight">
          Historial de pedidos
        </h2>
        {data && data.totalCount > 0 && (
          <span className="text-muted-foreground text-sm">
            {data.totalCount} {data.totalCount === 1 ? 'pedido' : 'pedidos'}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-muted-foreground text-sm">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={!hasPreviousPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              size="sm"
              variant="outline"
            >
              <ChevronLeftIcon className="size-4" />
              Anterior
            </Button>
            <Button
              disabled={!hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              size="sm"
              variant="outline"
            >
              Siguiente
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
