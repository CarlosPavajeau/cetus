import type { Product } from '@cetus/api-client/types/products'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { DataGrid, DataGridContainer } from '@cetus/ui/data-grid'
import { DataGridPagination } from '@cetus/ui/data-grid-pagination'
import { DataGridTable } from '@cetus/ui/data-grid-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cetus/ui/dropdown-menu'
import { ScrollArea, ScrollBar } from '@cetus/ui/scroll-area'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { DeleteProductDialog } from '@cetus/web/features/products/components/delete-product.dialog'
import { cn } from '@cetus/web/shared/utils'
import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  type Row,
  useReactTable,
} from '@tanstack/react-table'
import { EllipsisIcon, EyeIcon } from 'lucide-react'
import { useState } from 'react'

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
    id: 'category',
    accessorKey: 'category',
    header: 'Categoría',
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.getValue('category') ?? 'Desconocida'}
      </Badge>
    ),
  },
  {
    id: 'categoryId',
    accessorKey: 'categoryId',
    size: 100,
    enableHiding: true,
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
]

type Props = {
  products?: Product[]
  isLoading: boolean
}

export function ProductsTable({ products, isLoading }: Props) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })

  const table = useReactTable({
    columns,
    data: products || [],
    pageCount: Math.ceil((products?.length || 0) / pagination.pageSize),
    getRowId: (row: Product) => row.id,
    state: {
      pagination,
      columnVisibility: {
        categoryId: false,
      },
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <DataGrid
      isLoading={isLoading}
      recordCount={products?.length || 0}
      table={table}
      tableLayout={{ dense: true }}
    >
      <div className="w-full space-y-2.5">
        <DataGridContainer>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>

        <DataGridPagination />
      </div>
    </DataGrid>
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
        <DropdownMenuItem asChild>
          <Link params={{ id: row.original.id }} to="/app/products/$id/details">
            <EyeIcon aria-hidden="true" className="opacity-60" size={16} />
            Ver detalles
          </Link>
        </DropdownMenuItem>

        <DeleteProductDialog product={row.original} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
