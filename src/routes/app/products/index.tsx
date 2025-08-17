import type { Product } from '@/api/products'
import { Currency } from '@/components/currency'
import { TableFacetedFilter } from '@/components/data-table/faceted-filter'
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
import { useCategories } from '@/hooks/categories'
import { useProducts } from '@/hooks/products'
import { usePagination } from '@/hooks/use-pagination'
import { cn } from '@/shared/cn'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  type Row,
  useReactTable,
} from '@tanstack/react-table'
import {
  CircleXIcon,
  EllipsisIcon,
  ListFilterIcon,
  PlusIcon,
} from 'lucide-react'
import { type Key, useCallback, useId, useMemo, useRef, useState } from 'react'

export const Route = createFileRoute('/app/products/')({
  component: RouteComponent,
})

export const DEFAULT_PAGE_SIZE = 5
const MINIMUM_STOCK = 3

const categoryFilterFn: FilterFn<Product> = (
  row,
  columnId,
  filterValue: string[],
) => {
  if (!filterValue?.length) {
    return true
  }

  const categoryId = row.getValue(columnId) as string

  return filterValue.includes(categoryId)
}

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
            <Currency currency="COP" value={row.getValue('price')} />
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
            {row.getValue<number>('stock') < MINIMUM_STOCK && (
              <Badge className="rounded" variant="destructive">
                Bajo stock
              </Badge>
            )}
          </div>
        ),
        size: 60,
      },
      {
        id: 'categoryId',
        accessorKey: 'categoryId',
        size: 100,
        enableHiding: true,
        filterFn: categoryFilterFn,
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
        size: 70,
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
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: {
      columnFilters,
      pagination,
      columnVisibility: {
        categoryId: false,
      },
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

function SearchInput({ table, id }: Readonly<SearchInputProps>) {
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
    <div className="relative flex-1">
      <Input
        aria-label="Buscar por nombre"
        className={cn(
          'peer min-w-60 flex-1 ps-9',
          Boolean(filterValue) && 'pe-9',
        )}
        id={`${id}-input`}
        onChange={(e) => nameColumn?.setFilterValue(e.target.value)}
        placeholder="Buscar por nombre..."
        ref={inputRef}
        type="text"
        value={filterValue ?? ''}
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
        <ListFilterIcon aria-hidden="true" size={16} />
      </div>
      {Boolean(filterValue) && (
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

type CategoryFilterProps = {
  table: ReturnType<typeof useReactTable<Product>>
}

function CategoryFilter({ table }: Readonly<CategoryFilterProps>) {
  const categoryColumn = table.getColumn('categoryId') as Column<Product, Key>
  const { isLoading, categories } = useCategories()

  if (!categoryColumn || isLoading) {
    return null
  }

  if (!categories) {
    return null
  }

  const options = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }))

  return (
    <TableFacetedFilter
      column={categoryColumn}
      options={options}
      title="Categoría"
      width={300}
    />
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
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading font-semibold text-2xl">Productos</h1>
        <div>
          <Button asChild className="ml-auto">
            <Link to="/app/products/new">
              <PlusIcon
                aria-hidden="true"
                className="-ms-1 opacity-60"
                size={16}
              />
              Crear producto
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput id={id} table={table} />

        <CategoryFilter table={table} />
      </div>

      <div className="grid gap-4 overflow-hidden">
        <DataTable table={table} />
        <TablePagination paginationInfo={paginationInfo} table={table} />
      </div>
    </>
  )
}

function RowActions({ row }: { row: Row<Product> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            aria-label="Edit item"
            className="shadow-none"
            size="icon"
            variant="ghost"
          >
            <EllipsisIcon aria-hidden="true" size={16} />
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
