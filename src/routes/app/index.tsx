import {
  ORDER_STATUS_OPTIONS,
  OrderStatus,
  type SimpleOrder,
} from '@/api/orders'
import { AccessDenied } from '@/components/access-denied'
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
import { useClientMethod, useHub } from '@/hooks/realtime/use-hub'
import { cn } from '@/shared/cn'
import { Protect } from '@clerk/clerk-react'
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
        id={`${id}-input`}
        className={cn(
          'peer min-w-60 flex-1 ps-9',
          Boolean(searchTerm) && 'pe-9',
        )}
        value={searchTerm ?? ''}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar por número de orden..."
        type="text"
        aria-label="Buscar por número de orden"
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
        <ListFilterIcon size={16} aria-hidden="true" />
      </div>
      {Boolean(searchTerm) && (
        <button
          className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Clear filter"
          onClick={handleClearFilter}
        >
          <CircleXIcon size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function RouteComponent() {
  const { orders, isLoading } = useOrders()
  const queryClient = useQueryClient()

  const url = `${import.meta.env.PUBLIC_API_URL}/realtime/orders`
  const { connection } = useHub(url)
  useClientMethod(connection, 'ReceiveCreatedOrder', (order: SimpleOrder) => {
    queryClient.setQueryData<SimpleOrder[]>(['orders'], (oldOrders) => {
      if (!oldOrders) return [order]

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
    if (!orders) return []

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
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading font-semibold text-2xl">Pedidos</h1>

        <div>
          <Button variant="outline" onClick={refresh}>
            <RefreshCwIcon
              className="-ms-1 opacity-60"
              size={16}
              aria-hidden="true"
            />
            Recargar
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput onSearch={handleSearch} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ListFilterIcon size={16} aria-hidden="true" />
              Estado
              {statuses.length > 0 && (
                <>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <Badge
                    variant="default"
                    className="rounded-sm px-1 font-normal lg:hidden"
                  >
                    {statuses.length}
                  </Badge>
                  <div className="hidden space-x-1 lg:flex">
                    {statuses.length > 2 ? (
                      <Badge
                        variant="default"
                        className="rounded-sm px-1 font-normal"
                      >
                        {statuses.length} seleccionados
                      </Badge>
                    ) : (
                      ORDER_STATUS_OPTIONS.filter((option) =>
                        statuses.includes(option.value),
                      ).map((option) => (
                        <Badge
                          variant="default"
                          key={option.value}
                          className="rounded-sm px-1 font-normal"
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
                key={option.value}
                className="capitalize"
                checked={statuses.includes(option.value)}
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
    </Protect>
  )
}
