import type { Product } from '@cetus/api-client/types/products'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cetus/ui/dropdown-menu'
import { TablePagination } from '@cetus/web/components/data-table/pagination'
import { DataTable } from '@cetus/web/components/data-table/table'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { Skeleton } from '@cetus/web/components/ui/skeleton'
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
      <div className="flex flex-col gap-1">
        <span>{row.getValue('name')}</span>
        <span className="text-muted-foreground text-xs">
          {row.getValue('slug')}
        </span>
      </div>
    ),
    size: 180,
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'category',
    accessorKey: 'category',
    header: 'Categoría',
    size: 180,
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'categoryId',
    accessorKey: 'categoryId',
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
    size: 60,
    meta: {
      skeleton: <Skeleton className="h-5 w-16" />,
    },
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
    size: 120,
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <RowActions row={row} />,
    size: 60,
    enableHiding: false,
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
]

type Props = {
  products?: Product[]
}

export function ProductsTable({ products }: Props) {
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
    <div className="grid gap-4 overflow-hidden">
      <DataTable table={table} />
      <TablePagination table={table} />
    </div>
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
