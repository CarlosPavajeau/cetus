import {
  OrderStatus,
  OrderStatusColor,
  OrderStatusText,
  type SimpleOrder,
} from '@/api/orders'
import { AccessDenied } from '@/components/access-denied'
import { Currency } from '@/components/currency'
import { TablePagination } from '@/components/data-table/pagination'
import { DataTable } from '@/components/data-table/table'
import { DefaultLoader } from '@/components/default-loader'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useClientMethod, useHub } from '@/hooks/realtime/use-hub'
import { usePagination } from '@/hooks/use-pagination'
import { useOrders } from '@/hooks/user-orders'
import { cn } from '@/shared/cn'
import { Protect } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type PaginationState,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  CircleXIcon,
  FilterIcon,
  ListFilterIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

const statusFilterFn: FilterFn<SimpleOrder> = (
  row,
  columnId,
  filterValue: string[],
) => {
  if (!filterValue?.length) return true
  const status = row.getValue(columnId) as string
  return filterValue.includes(status)
}

const orderNumberFilterFn: FilterFn<SimpleOrder> = (
  row,
  columnId,
  filterValue: string,
) => {
  const value = row.getValue(columnId) as number
  return String(value).includes(filterValue)
}

const columns: ColumnDef<SimpleOrder>[] = [
  {
    id: 'orderNumber',
    accessorKey: 'orderNumber',
    header: '#',
    filterFn: orderNumberFilterFn,
  },
  {
    id: 'address',
    accessorKey: 'address',
    header: 'Dirección',
  },
  {
    id: 'total',
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }) => (
      <div>
        <Currency value={row.getValue('total')} currency="COP" />
      </div>
    ),
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => (
      <Badge variant="outline">
        <span
          className={cn(
            'size-1.5 rounded-full',
            OrderStatusColor[row.getValue('status') as OrderStatus],
          )}
          aria-hidden="true"
        ></span>
        {OrderStatusText[row.getValue('status') as OrderStatus]}
      </Badge>
    ),
    filterFn: statusFilterFn,
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Creado',
    cell: ({ row }) => (
      <div>
        <FormattedDate date={new Date(row.getValue('createdAt'))} />
      </div>
    ),
  },
]

type SearchInputProps = {
  table: ReturnType<typeof useReactTable<SimpleOrder>>
  id: string
}

function SearchInput({ table, id }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const orderNumberColumn = table.getColumn('orderNumber')
  const filterValue = orderNumberColumn?.getFilterValue() as string

  const handleClearFilter = useCallback(() => {
    orderNumberColumn?.setFilterValue('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [orderNumberColumn])

  return (
    <div className="relative">
      <Input
        id={`${id}-input`}
        ref={inputRef}
        className={cn('peer min-w-60 ps-9', Boolean(filterValue) && 'pe-9')}
        value={filterValue ?? ''}
        onChange={(e) => orderNumberColumn?.setFilterValue(e.target.value)}
        placeholder="Buscar por número de orden..."
        type="text"
        aria-label="Buscar por número de orden"
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
        <ListFilterIcon size={16} aria-hidden="true" />
      </div>
      {Boolean(filterValue) && (
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

type StatusFilterProps = {
  table: ReturnType<typeof useReactTable<SimpleOrder>>
  id: string
  uniqueStatusValues: string[]
  selectedStatuses: string[]
  statusCounts: Map<string, number>
}

function StatusFilter({
  table,
  id,
  uniqueStatusValues,
  selectedStatuses,
  statusCounts,
}: StatusFilterProps) {
  const handleStatusChange = useCallback(
    (checked: boolean, value: string) => {
      const filterValue = table
        .getColumn('status')
        ?.getFilterValue() as string[]
      const newFilterValue = filterValue ? [...filterValue] : []

      if (checked) {
        newFilterValue.push(value)
      } else {
        const index = newFilterValue.indexOf(value)
        if (index > -1) {
          newFilterValue.splice(index, 1)
        }
      }

      table
        .getColumn('status')
        ?.setFilterValue(newFilterValue.length ? newFilterValue : undefined)
    },
    [table],
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <FilterIcon
            className="-ms-1 opacity-60"
            size={16}
            aria-hidden="true"
          />
          Estado
          {selectedStatuses.length > 0 && (
            <span className="-me-1 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
              {selectedStatuses.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-36 p-3" align="start">
        <div className="space-y-3">
          <div className="font-medium text-muted-foreground text-xs">
            Filtrar por estado
          </div>
          <div className="space-y-3">
            {uniqueStatusValues.map((value, i) => (
              <div key={value} className="flex items-center gap-2">
                <Checkbox
                  id={`${id}-status-${i}`}
                  checked={selectedStatuses.includes(value)}
                  onCheckedChange={(checked) =>
                    handleStatusChange(checked as boolean, value)
                  }
                />
                <Label
                  htmlFor={`${id}-status-${i}`}
                  className="flex grow justify-between gap-2 font-normal"
                >
                  {OrderStatusText[value as unknown as OrderStatus]}{' '}
                  <span className="ms-2 text-muted-foreground text-xs">
                    {statusCounts.get(value)}
                  </span>
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function RouteComponent() {
  const { orders, isLoading } = useOrders()
  const id = useId()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Set up initial column filters
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    {
      id: 'status',
      value: [OrderStatus.Pending, OrderStatus.Paid],
    },
  ])

  // Set up real-time updates
  const url = `${import.meta.env.PUBLIC_API_URL}/realtime/orders`
  const { connection } = useHub(url)
  useClientMethod(connection, 'ReceiveCreatedOrder', () => {
    queryClient.invalidateQueries({
      queryKey: ['orders'],
    })
  })

  // Set up pagination
  const pageSize = 5
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  })

  // Set up table
  const table = useReactTable({
    data: orders ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    state: {
      pagination,
      columnFilters,
    },
  })

  // Get unique status values
  const uniqueStatusValues = useMemo(() => {
    const statusColumn = table.getColumn('status')
    if (!statusColumn) return []
    const values = Array.from(statusColumn.getFacetedUniqueValues().keys())
    return values.sort()
  }, [table.getColumn('status')?.getFacetedUniqueValues()])

  // Get counts for each status
  const statusCounts = useMemo(() => {
    const statusColumn = table.getColumn('status')
    if (!statusColumn) return new Map()
    return statusColumn.getFacetedUniqueValues()
  }, [table.getColumn('status')?.getFacetedUniqueValues()])

  // Get selected statuses
  const selectedStatuses = useMemo(() => {
    const filterValue = table.getColumn('status')?.getFilterValue() as string[]
    return filterValue ?? []
  }, [table.getColumn('status')?.getFilterValue()])

  // Get pagination info
  const paginationInfo = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 5,
  })

  // Handlers
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['orders'],
    })
  }, [queryClient])

  const goToOrder = useCallback(
    (order: SimpleOrder) => {
      navigate({
        to: `/app/orders/${order.id}`,
      })
    },
    [navigate],
  )

  return (
    <section className="space-y-4">
      <Protect permission="org:app:access" fallback={<AccessDenied />}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold font-heading text-2xl text-foreground">
              Pedidos
            </h1>
            <span className="text-muted-foreground text-sm">
              Aquí puedes ver los pedidos de tus clientes.
            </span>
          </div>
        </div>

        {isLoading && <DefaultLoader />}

        {!isLoading && orders && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <SearchInput table={table} id={id} />
                <StatusFilter
                  table={table}
                  id={id}
                  uniqueStatusValues={uniqueStatusValues}
                  selectedStatuses={selectedStatuses}
                  statusCounts={statusCounts}
                />
              </div>

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

            <div className="overflow-hidden rounded-md border bg-background">
              <DataTable table={table} onRowClick={goToOrder} />
            </div>

            <TablePagination paginationInfo={paginationInfo} table={table} />
          </div>
        )}
      </Protect>
    </section>
  )
}
