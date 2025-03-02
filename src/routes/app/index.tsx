import {
  OrderStatus,
  OrderStatusColor,
  OrderStatusText,
  type SimpleOrder,
} from '@/api/orders'
import { Currency } from '@/components/currency'
import { DefaultLoader } from '@/components/default-loader'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { useId, useMemo, useState } from 'react'

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

const columns: ColumnDef<SimpleOrder>[] = [
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

function RouteComponent() {
  const { orders, isLoading } = useOrders()

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    {
      id: 'status',
      value: [OrderStatus.Pending, OrderStatus.Paid],
    },
  ])

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

  const selectedStatuses = useMemo(() => {
    const filterValue = table.getColumn('status')?.getFilterValue() as string[]
    return filterValue ?? []
  }, [table.getColumn('status')?.getFilterValue()])

  const handleStatusChange = (checked: boolean, value: string) => {
    const filterValue = table.getColumn('status')?.getFilterValue() as string[]
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
  }

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 5,
  })

  const queryClient = useQueryClient()
  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['orders'],
    })
  }

  const navigate = useNavigate()

  const goToOrder = (orderId: string) => {
    navigate({
      to: `/app/orders/${orderId}`,
    })
  }

  const id = useId()

  return (
    <section className="space-y-4">
      <Protect>
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
                              onCheckedChange={(checked: boolean) =>
                                handleStatusChange(checked, value)
                              }
                            />
                            <Label
                              htmlFor={`${id}-status-${i}`}
                              className="flex grow justify-between gap-2 font-normal"
                            >
                              {OrderStatusText[value as OrderStatus]}{' '}
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
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="hover:bg-transparent"
                    >
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        onClick={() => goToOrder(row.original.id)}
                        className="cursor-pointer"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        Sin resultados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between gap-3 max-sm:flex-col">
              {/* Page number information */}
              <p
                className="flex-1 whitespace-nowrap text-muted-foreground text-sm"
                aria-live="polite"
              >
                Página{' '}
                <span className="text-foreground">
                  {table.getState().pagination.pageIndex + 1}
                </span>{' '}
                de{' '}
                <span className="text-foreground">{table.getPageCount()}</span>
              </p>

              {/* Pagination buttons */}
              <div className="grow">
                <Pagination>
                  <PaginationContent>
                    {/* Previous page button */}
                    <PaginationItem>
                      <Button
                        size="icon"
                        variant="outline"
                        className="disabled:pointer-events-none disabled:opacity-50"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        aria-label="Go to previous page"
                      >
                        <ChevronLeftIcon size={16} aria-hidden="true" />
                      </Button>
                    </PaginationItem>

                    {/* Left ellipsis (...) */}
                    {showLeftEllipsis && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Page number buttons */}
                    {pages.map((page) => {
                      const isActive =
                        page === table.getState().pagination.pageIndex + 1
                      return (
                        <PaginationItem key={page}>
                          <Button
                            size="icon"
                            variant={`${isActive ? 'outline' : 'ghost'}`}
                            onClick={() => table.setPageIndex(page - 1)}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {page}
                          </Button>
                        </PaginationItem>
                      )
                    })}

                    {/* Right ellipsis (...) */}
                    {showRightEllipsis && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Next page button */}
                    <PaginationItem>
                      <Button
                        size="icon"
                        variant="outline"
                        className="disabled:pointer-events-none disabled:opacity-50"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        aria-label="Go to next page"
                      >
                        <ChevronRightIcon size={16} aria-hidden="true" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>

              {/* Results per page */}
              <div className="flex flex-1 justify-end">
                <Select
                  value={table.getState().pagination.pageSize.toString()}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value))
                  }}
                  aria-label="Results per page"
                >
                  <SelectTrigger
                    id="results-per-page"
                    className="w-fit whitespace-nowrap"
                  >
                    <SelectValue placeholder="Select number of results" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 25, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={pageSize.toString()}>
                        {pageSize} / página
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </Protect>
    </section>
  )
}
