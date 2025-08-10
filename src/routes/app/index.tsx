import { ORDER_STATUS_OPTIONS } from '@/api/orders'
import { DefaultLoader } from '@/components/default-loader'
import { FiltersBar } from '@/components/order/app/filters-bar'
import { OrdersHeader } from '@/components/order/app/orders-header'
import { OrdersList } from '@/components/order/app/orders-list'
import { useOrders } from '@/hooks/orders'
import { useOrderFilters } from '@/hooks/orders/use-order-filters'
import { useOrderRealtime } from '@/hooks/orders/use-order-realtime'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { memo, useCallback } from 'react'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

// Empty state component
const EmptyState = memo(({ hasFilters }: { hasFilters: boolean }) => (
  <div className="flex h-full w-full items-center justify-center">
    <p className="text-muted-foreground">
      {hasFilters
        ? 'No se encontraron pedidos con los filtros aplicados'
        : 'No hay pedidos disponibles'}
    </p>
  </div>
))

EmptyState.displayName = 'EmptyState'

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

  const hasFilters =
    searchTerm !== '' || statuses.length < ORDER_STATUS_OPTIONS.length
  const isEmpty = !orders || orders.length === 0
  const noResults = filteredOrders.length === 0

  if (isLoading) {
    return <DefaultLoader />
  }

  if (isEmpty) {
    return (
      <>
        <OrdersHeader onRefresh={refresh} />
        <EmptyState hasFilters={false} />
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
      {noResults ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <OrdersList orders={filteredOrders} />
      )}
    </>
  )
}
