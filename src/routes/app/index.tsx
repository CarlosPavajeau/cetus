import { DefaultLoader } from '@/components/default-loader'
import { FiltersBar } from '@/components/order/app/filters-bar'
import { OrdersHeader } from '@/components/order/app/orders-header'
import { OrdersList } from '@/components/order/app/orders-list'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { useOrders } from '@/hooks/orders'
import { useOrderFilters } from '@/hooks/orders/use-order-filters'
import { useOrderRealtime } from '@/hooks/orders/use-order-realtime'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PackageXIcon } from 'lucide-react'
import { useCallback } from 'react'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

const EmptyState = () => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <PackageXIcon />
      </EmptyMedia>
      <EmptyTitle>No hay pedidos</EmptyTitle>
      <EmptyDescription>
        No hay pedidos disponibles con los filtros aplicados
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
)

function RouteComponent() {
  const { orders, isLoading } = useOrders()
  const queryClient = useQueryClient()

  useOrderRealtime()

  const {
    filteredOrders,
    searchTerm,
    statuses,
    handleSearch,
    handleStatusToggle,
  } = useOrderFilters(orders)

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['orders'],
    })
  }, [queryClient])

  const isEmpty = !orders || orders.length === 0
  const noResults = filteredOrders.length === 0

  if (isLoading) {
    return <DefaultLoader />
  }

  if (isEmpty) {
    return (
      <>
        <OrdersHeader onRefresh={refresh} />
        <EmptyState />
      </>
    )
  }

  return (
    <>
      <OrdersHeader onRefresh={refresh} />
      <FiltersBar
        onSearch={handleSearch}
        onStatusToggle={handleStatusToggle}
        searchTerm={searchTerm}
        statuses={statuses}
      />
      {noResults ? <EmptyState /> : <OrdersList orders={filteredOrders} />}
    </>
  )
}
