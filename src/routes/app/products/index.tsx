import type { Product } from '@/api/products'
import { AccessDenied } from '@/components/access-denied'
import { ConfirmDeleteProductDialog } from '@/components/confirm-delete-product-dialog'
import { Currency } from '@/components/currency'
import { DefaultLoader } from '@/components/default-loader'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
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
import { UpdateProductDialog } from '@/components/update-product-dialog'
import { usePagination } from '@/hooks/use-pagination'
import { useProducts } from '@/hooks/use-products'
import { cn } from '@/shared/cn'
import { Protect } from '@clerk/clerk-react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type Row,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleXIcon,
  EllipsisIcon,
  ListFilterIcon,
  PlusIcon,
} from 'lucide-react'
import { useId, useRef, useState } from 'react'

export const Route = createFileRoute('/app/products/')({
  component: RouteComponent,
})

const columns: ColumnDef<Product>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('name')}</div>
    ),
    size: 180,
  },
  {
    id: 'price',
    accessorKey: 'price',
    header: 'Precio',
    cell: ({ row }) => (
      <div>
        <Currency value={row.getValue('price')} currency="COP" />
      </div>
    ),
    size: 90,
  },
  {
    id: 'stock',
    accessorKey: 'stock',
    header: 'Stock',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        {row.getValue('stock')}
        {row.getValue<number>('stock') < 10 && (
          <Badge variant="destructive" className="rounded">
            Bajo stock
          </Badge>
        )}
      </div>
    ),
    size: 120,
  },
  {
    id: 'enabled',
    accessorKey: 'enabled',
    header: 'Estado',
    cell: ({ row }) => (
      <Badge
        className={cn(
          !row.getValue('enabled') &&
            'bg-muted-foreground/60 text-primary-foreground',
        )}
      >
        {row.getValue('enabled') ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
    size: 100,
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
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <RowActions row={row} />,
    size: 60,
    enableHiding: false,
  },
]

function RouteComponent() {
  const { products, isLoading } = useProducts()

  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const pageSize = 5

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  })

  const table = useReactTable({
    data: products ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: {
      columnFilters,
      pagination,
    },
  })

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 5,
  })

  return (
    <section className="space-y-4">
      <Protect permission="org:app:access" fallback={<AccessDenied />}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold font-heading text-2xl text-foreground">
              Productos
            </h1>
          </div>
        </div>

        {isLoading && <DefaultLoader />}

        {!isLoading && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Input
                    id={`${id}-input`}
                    ref={inputRef}
                    className={cn(
                      'peer min-w-60 ps-9',
                      Boolean(table.getColumn('name')?.getFilterValue()) &&
                        'pe-9',
                    )}
                    value={
                      (table.getColumn('name')?.getFilterValue() ??
                        '') as string
                    }
                    onChange={(e) =>
                      table.getColumn('name')?.setFilterValue(e.target.value)
                    }
                    placeholder="Buscar por nombre..."
                    type="text"
                    aria-label="Buscar por nombre"
                  />
                  <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                    <ListFilterIcon size={16} aria-hidden="true" />
                  </div>
                  {Boolean(table.getColumn('name')?.getFilterValue()) && (
                    <button
                      className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Clear filter"
                      onClick={() => {
                        table.getColumn('name')?.setFilterValue('')
                        if (inputRef.current) {
                          inputRef.current.focus()
                        }
                      }}
                    >
                      <CircleXIcon size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button className="ml-auto" asChild>
                  <Link to="/app/products/new">
                    <PlusIcon
                      className="-ms-1 opacity-60"
                      size={16}
                      aria-hidden="true"
                    />
                    Crear producto
                  </Link>
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
                          <TableHead
                            key={header.id}
                            style={{ width: `${header.getSize()}px` }}
                            className="h-11"
                          >
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
                          <TableCell key={cell.id} className="last:py-0">
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

function RowActions({ row }: { row: Row<Product> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="shadow-none"
            aria-label="Edit item"
          >
            <EllipsisIcon size={16} aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <UpdateProductDialog product={row.original} />

        <ConfirmDeleteProductDialog product={row.original} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
