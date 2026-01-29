import type {
  OrderQueryParams,
  OrderStatus,
} from '@cetus/api-client/types/orders'
import {
  orderStatusColors,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Button } from '@cetus/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cetus/ui/dropdown-menu'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { OrdersList } from '@cetus/web/features/orders/components/orders-list'
import { orderQueries } from '@cetus/web/features/orders/queries'
import { useOrderRealtime } from '@cetus/web/hooks/orders/use-order-realtime'
import {
  ArrowDown01Icon,
  Refresh01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PackageXIcon } from 'lucide-react'
import { useState } from 'react'

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
  useOrderRealtime()

  const [orderFilters, setOrderFilters] = useState<OrderQueryParams>({
    statuses: [
      'pending_payment',
      'payment_confirmed',
      'processing',
    ] as OrderStatus[],
  })
  const { data, isLoading } = useQuery(orderQueries.list(orderFilters))

  const toggleStatus = (status: OrderStatus) => {
    setOrderFilters((prev) => ({
      ...prev,
      statuses: prev.statuses?.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...(prev.statuses ?? []), status],
    }))
  }

  const queryClient = useQueryClient()
  const refresh = () => {
    queryClient.invalidateQueries(orderQueries.list(orderFilters))
  }

  const orders = data?.items || []
  const isEmpty = !orders || orders.length === 0

  const content = () => {
    if (isLoading) {
      return <DefaultLoader />
    }

    if (isEmpty) {
      return <EmptyState />
    }

    return <OrdersList orders={orders} />
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="justify-between" variant="outline">
              <div className="flex items-center -space-x-0.5">
                {Object.entries(orderStatusColors).map(([key, label]) => (
                  <div
                    className="size-2.5 shrink-0 rounded-full border grayscale transition-all data-[active=true]:border-(--color) data-[active=true]:bg-(--color) data-[active=true]:grayscale-0"
                    data-active={orderFilters.statuses?.includes(
                      key as unknown as OrderStatus,
                    )}
                    key={key}
                    style={
                      {
                        '--color': label,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
              Estados {orderFilters.statuses?.length || 0}/
              {Object.entries(orderStatusColors).length}
              <HugeiconsIcon icon={ArrowDown01Icon} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {Object.entries(orderStatusLabels).map(([key, label]) => {
              const isSelected = orderFilters.statuses?.includes(
                key as unknown as OrderStatus,
              )
              const color = orderStatusColors[key as unknown as OrderStatus]
              return (
                <DropdownMenuItem
                  data-active={isSelected}
                  key={key}
                  onSelect={() => toggleStatus(key as unknown as OrderStatus)}
                  style={
                    {
                      '--color': color,
                    } as React.CSSProperties
                  }
                >
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-(--color)" />
                    {label}
                  </div>

                  <HugeiconsIcon
                    className="ml-auto opacity-0 group-data-[active=true]/dropdown-menu-item:opacity-100"
                    icon={Tick02Icon}
                  />
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={refresh} size="icon" variant="outline">
          <HugeiconsIcon icon={Refresh01Icon} />
        </Button>
      </div>

      <div>{content()}</div>
    </div>
  )
}
