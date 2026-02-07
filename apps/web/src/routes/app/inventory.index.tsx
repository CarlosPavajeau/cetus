import type {
  InventoryTransactionQueryParams,
  InventoryTransactionType,
} from '@cetus/api-client/types/products'
import { inventoryTransactionTypeLabels } from '@cetus/shared/constants/inventory'
import { Button } from '@cetus/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cetus/ui/dropdown-menu'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { DateRangeFilter } from '@cetus/web/features/orders/components/date-range-filter'
import { InventoryMovementsTable } from '@cetus/web/features/products/components/inventory-movements-table'
import { productQueries } from '@cetus/web/features/products/queries'
import { ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { PaginationState } from '@tanstack/react-table'
import { TagIcon } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/inventory/')({
  component: RouteComponent,
})

const transactionTypeColors: Record<InventoryTransactionType, string> = {
  sale: '#10b981',
  adjustment: '#6366f1',
  return: '#f59e0b',
  purchase: '#3b82f6',
  transfer: '#8b5cf6',
}

function RouteComponent() {
  const [types, setTypes] = useState<InventoryTransactionType[]>(['adjustment'])
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const toggleType = (type: InventoryTransactionType) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const handleDateRangeChange = (range: { from?: string; to?: string }) => {
    setDateRange(range)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const queryParams: InventoryTransactionQueryParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    from: dateRange.from ? new Date(dateRange.from) : undefined,
    to: dateRange.to ? new Date(dateRange.to) : undefined,
    types: types.length > 0 ? types : undefined,
  }

  const { data, isLoading } = useQuery(
    productQueries.inventory.transactions(queryParams),
  )

  const items = data?.items ?? (Array.isArray(data) ? data : [])
  const pageCount = data?.totalPages ?? 0

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <TagIcon className="size-4" />
              <div className="flex items-center -space-x-0.5">
                {Object.entries(transactionTypeColors).map(([key, color]) => (
                  <div
                    className="size-2.5 shrink-0 rounded-full border grayscale transition-all data-[active=true]:border-(--color) data-[active=true]:bg-(--color) data-[active=true]:grayscale-0"
                    data-active={types.includes(
                      key as InventoryTransactionType,
                    )}
                    key={key}
                    style={
                      {
                        '--color': color,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
              Tipos {types.length}/{Object.keys(transactionTypeColors).length}
              <HugeiconsIcon icon={ArrowDown01Icon} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56">
            {Object.entries(inventoryTransactionTypeLabels).map(
              ([key, label]) => {
                const isSelected = types.includes(
                  key as InventoryTransactionType,
                )
                const color =
                  transactionTypeColors[key as InventoryTransactionType]
                return (
                  <DropdownMenuItem
                    data-active={isSelected}
                    key={key}
                    onSelect={() => toggleType(key as InventoryTransactionType)}
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
              },
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DateRangeFilter
          from={dateRange.from}
          onChange={handleDateRangeChange}
          to={dateRange.to}
        />
      </div>

      {isLoading && <DefaultLoader />}
      {!isLoading && (
        <InventoryMovementsTable
          data={items}
          onPaginationChange={setPagination}
          pageCount={pageCount}
          pagination={pagination}
        />
      )}
    </div>
  )
}
