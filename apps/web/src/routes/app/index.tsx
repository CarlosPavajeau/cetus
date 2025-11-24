import { api } from '@cetus/api-client'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { FiltersBar } from '@cetus/web/features/orders/components/filters-bar'
import { OrdersHeader } from '@cetus/web/features/orders/components/orders-header'
import { OrdersList } from '@cetus/web/features/orders/components/orders-list'
import { useOrderFilters } from '@cetus/web/hooks/orders/use-order-filters'
import { useOrderRealtime } from '@cetus/web/hooks/orders/use-order-realtime'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: api.orders.list,
  })
  const orders = data?.items || []

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
