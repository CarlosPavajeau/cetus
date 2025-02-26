import {
  type OrderStatus,
  OrderStatusColor,
  OrderStatusText,
  type SimpleOrder,
} from '@/api/orders'
import { Currency } from '@/components/currency'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination'
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
import { createFileRoute } from '@tanstack/react-router'
import {
  type ColumnDef,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

const columns: ColumnDef<SimpleOrder>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
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
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
  })

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

        {isLoading && (
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-bold font-heading text-2xl text-foreground">
                  Cargando...
                </h1>
              </div>
            </div>
          </div>
        )}

        {!isLoading && orders && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div></div>

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
              <Table className="table-fixed">
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
