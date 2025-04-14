import {
  ORDER_STATUS_OPTIONS,
  OrderStatus,
  OrderStatusColor,
  OrderStatusText,
  type SimpleOrder,
} from '@/api/orders'
import { AccessDenied } from '@/components/access-denied'
import { Currency } from '@/components/currency'
import { TableFacetedFilter } from '@/components/data-table/faceted-filter'
import { TablePagination } from '@/components/data-table/pagination'
import { DataTable } from '@/components/data-table/table'
import { DefaultLoader } from '@/components/default-loader'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useOrders } from '@/hooks/orders'
import { useClientMethod, useHub } from '@/hooks/realtime/use-hub'
import { usePagination } from '@/hooks/use-pagination'
import { cn } from '@/shared/cn'
import { Protect } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  type Column,
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
import { CircleXIcon, ListFilterIcon, RefreshCwIcon } from 'lucide-react'
import { type Key, useCallback, useId, useRef, useState } from 'react'

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

function RouteComponent() {
  const { orders, isLoading } = useOrders()
  const id = useId()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    {
      id: 'status',
      value: [OrderStatus.Pending, OrderStatus.Paid],
    },
  ])

  const url = `${import.meta.env.PUBLIC_API_URL}/realtime/orders`
  const { connection } = useHub(url)
  useClientMethod(connection, 'ReceiveCreatedOrder', () => {
    queryClient.invalidateQueries({
      queryKey: ['orders'],
    })
  })

  const pageSize = 5
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  })

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

  const paginationInfo = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 5,
  })

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

  if (isLoading) {
    return <DefaultLoader />
  }

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <Card className="my-6">
        <CardHeader className="gap-4">
          <h1 className="font-bold font-heading text-2xl text-foreground">
            Pedidos
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput table={table} id={id} />

              {table.getColumn('status') && (
                <TableFacetedFilter
                  column={table.getColumn('status') as Column<SimpleOrder, Key>}
                  title="Estado"
                  options={ORDER_STATUS_OPTIONS}
                />
              )}
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
        </CardHeader>

        <CardContent className="px-0">
          <DataTable table={table} onRowClick={goToOrder} />
          <div className="mt-5 px-6">
            <TablePagination paginationInfo={paginationInfo} table={table} />
          </div>
        </CardContent>
      </Card>
    </Protect>
  )
}
