import type { Product } from '@/api/products'
import { AccessDenied } from '@/components/access-denied'
import { Currency } from '@/components/currency'
import { TablePagination } from '@/components/data-table/pagination'
import { DataTable } from '@/components/data-table/table'
import { DefaultLoader } from '@/components/default-loader'
import { FormattedDate } from '@/components/formatted-date'
import { ConfirmDeleteProductDialog } from '@/components/product/confirm-delete-product-dialog'
import { UpdateProductDialog } from '@/components/product/update-product-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useProducts } from '@/hooks/products'
import { usePagination } from '@/hooks/use-pagination'
import { cn } from '@/shared/cn'
import { Protect } from '@clerk/clerk-react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type Row,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  CircleXIcon,
  EllipsisIcon,
  ListFilterIcon,
  PlusIcon,
} from 'lucide-react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'

export const Route = createFileRoute('/app/products/')({
  component: RouteComponent,
})

export const DEFAULT_PAGE_SIZE = 5

const useProductColumns = (): ColumnDef<Product>[] => {
  return useMemo(
    () => [
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
    ],
    [],
  )
}

function useProductTable(products: Product[] | undefined) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const columns = useProductColumns()

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

  const paginationInfo = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 5,
  })

  return {
    table,
    paginationInfo,
  }
}

type SearchInputProps = {
  table: ReturnType<typeof useReactTable<Product>>
  id: string
}

function SearchInput({ table, id }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const nameColumn = table.getColumn('name')
  const filterValue = nameColumn?.getFilterValue() as string

  const handleClearFilter = useCallback(() => {
    nameColumn?.setFilterValue('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [nameColumn])

  return (
    <div className="relative">
      <Input
        id={`${id}-input`}
        ref={inputRef}
        className={cn('peer min-w-60 ps-9', Boolean(filterValue) && 'pe-9')}
        value={filterValue ?? ''}
        onChange={(e) => nameColumn?.setFilterValue(e.target.value)}
        placeholder="Buscar por nombre..."
        type="text"
        aria-label="Buscar por nombre"
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
  const { products, isLoading } = useProducts()
  const id = useId()

  const { table, paginationInfo } = useProductTable(products)

  if (isLoading) {
    return <DefaultLoader />
  }

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

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SearchInput table={table} id={id} />
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
            <DataTable table={table} />
          </div>

          <TablePagination table={table} paginationInfo={paginationInfo} />
        </div>
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
