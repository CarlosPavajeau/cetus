import {
  ORDER_STATUS_OPTIONS,
  OrderStatus,
  type SimpleOrder,
} from '@/api/orders'
import { DefaultLoader } from '@/components/default-loader'
import { OrderCard } from '@/components/order/order-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useOrders } from '@/hooks/orders'
import { useClientMethod, useHub, useHubGroup } from '@/hooks/realtime/use-hub'
import { cn } from '@/shared/cn'
import { useTenantStore } from '@/store/use-tenant-store'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CircleXIcon, ListFilterIcon, RefreshCwIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

type SearchInputProps = {
  initialValue?: string
  onSearch: (value: string) => void
  debounceTime?: number
}

function SearchInput({
  initialValue = '',
  onSearch,
  debounceTime = 300,
}: SearchInputProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue)
  const id = useId()

  // Debounce search term changes
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchTerm)
    }, debounceTime)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm, onSearch, debounceTime])

  const handleClearFilter = () => {
    setSearchTerm('')
  }

  return (
    <div className="relative flex-1">
      <Input
        aria-label="Buscar por número de orden"
        className={cn(
          'peer min-w-60 flex-1 ps-9',
          Boolean(searchTerm) && 'pe-9',
        )}
        id={`${id}-input`}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar por número de orden..."
        type="text"
        value={searchTerm ?? ''}
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
        <ListFilterIcon aria-hidden="true" size={16} />
      </div>
      {Boolean(searchTerm) && (
        <button
          aria-label="Clear filter"
          className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleClearFilter}
          type="button"
        >
          <CircleXIcon aria-hidden="true" size={16} />
        </button>
      )}
    </div>
  )
}

const HUB_URL = `${import.meta.env.VITE_API_URL}/realtime/orders`

function RouteComponent() {
  const { store } = useTenantStore()
  const { orders, isLoading } = useOrders()
  const queryClient = useQueryClient()

  const { connection } = useHub(HUB_URL)

  useHubGroup(connection, 'JoinStoreGroup', store?.slug)

  useClientMethod(connection, 'ReceiveCreatedOrder', (order: SimpleOrder) => {
    queryClient.setQueryData<SimpleOrder[]>(['orders'], (oldOrders) => {
      if (!oldOrders) {
        return [order]
      }

      return [...oldOrders, order]
    })
  })

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['orders'],
    })
  }, [queryClient])

  const [searchTerm, setSearchTerm] = useState<string>('')
  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const [statuses, setStatuses] = useState<OrderStatus[]>([
    OrderStatus.Pending,
    OrderStatus.Paid,
  ])
  const handleStatusChange = (value: OrderStatus) => {
    setStatuses((prev) => {
      if (prev.includes(value)) {
        return prev.filter((status) => status !== value)
      }
      return [...prev, value]
    })
  }

  const filteredOrders = useMemo(() => {
    if (!orders) {
      return []
    }

    return orders.filter((order) => {
      const isMatchingSearchTerm = order.orderNumber
        .toString()
        .includes(searchTerm)

      const isMatchingStatus =
        statuses.length === 0 || statuses.includes(order.status)

      return isMatchingSearchTerm && isMatchingStatus
    })
  }, [orders, searchTerm, statuses])

  if (isLoading) {
    return <DefaultLoader />
  }

  if (!orders) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">No hay pedidos disponibles</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading font-semibold text-2xl">Pedidos</h1>

        <div>
          <Button onClick={refresh} variant="outline">
            <RefreshCwIcon
              aria-hidden="true"
              className="-ms-1 opacity-60"
              size={16}
            />
            Recargar
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput onSearch={handleSearch} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2" variant="outline">
              <ListFilterIcon aria-hidden="true" size={16} />
              Estado
              {statuses.length > 0 && (
                <>
                  <Separator className="mx-2 h-4" orientation="vertical" />
                  <Badge
                    className="rounded-sm px-1 font-normal lg:hidden"
                    variant="secondary"
                  >
                    {statuses.length}
                  </Badge>
                  <div className="hidden space-x-1 lg:flex">
                    {statuses.length > 2 ? (
                      <Badge
                        className="rounded-sm px-1 font-normal"
                        variant="secondary"
                      >
                        {statuses.length} seleccionados
                      </Badge>
                    ) : (
                      ORDER_STATUS_OPTIONS.filter((option) =>
                        statuses.includes(option.value),
                      ).map((option) => (
                        <Badge
                          className="rounded-sm px-1 font-normal"
                          key={option.value}
                          variant="secondary"
                        >
                          {option.label}
                        </Badge>
                      ))
                    )}
                  </div>
                </>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56">
            {ORDER_STATUS_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                checked={statuses.includes(option.value)}
                className="capitalize"
                key={option.value}
                onCheckedChange={() => handleStatusChange(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3 pb-6">
        {filteredOrders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-muted-foreground">No hay pedidos disponibles</p>
        </div>
      )}
    </>
  )
}
