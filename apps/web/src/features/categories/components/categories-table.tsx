import type { Category } from '@cetus/api-client/types/categories'
import { Button } from '@cetus/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@cetus/ui/dropdown-menu'
import { Skeleton } from '@cetus/ui/skeleton'
import { TablePagination } from '@cetus/web/components/data-table/pagination'
import { DataTable } from '@cetus/web/components/data-table/table'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { DeleteCategoryDialog } from '@cetus/web/features/categories/components/delete-category.dialog'
import { EditCategoryDialog } from '@cetus/web/features/categories/components/edit-category.dialog'
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  type Row,
  useReactTable,
} from '@tanstack/react-table'
import { EllipsisIcon } from 'lucide-react'
import { useState } from 'react'

const columns: ColumnDef<Category>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Nombre',
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Fecha de creación',
    cell: ({ row }) => (
      <div>
        <FormattedDate date={new Date(row.getValue('createdAt'))} />
      </div>
    ),
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
  categories?: Category[]
}

export function CategoriesTable({ categories }: Props) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    columns,
    data: categories || [],
    pageCount: Math.ceil((categories?.length || 0) / pagination.pageSize),
    getRowId: (row: Category) => row.id,
    state: {
      pagination,
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

function RowActions({ row }: Readonly<{ row: Row<Category> }>) {
  const category = row.original

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
            <EllipsisIcon aria-hidden={true} size={16} />
          </Button>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <EditCategoryDialog category={category} />
        <DeleteCategoryDialog category={category} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
