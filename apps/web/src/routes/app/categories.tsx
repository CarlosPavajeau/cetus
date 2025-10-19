import { createFileRoute } from '@tanstack/react-router'
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  type Row,
  useReactTable,
} from '@tanstack/react-table'
import { EllipsisIcon, PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Category } from '@/api/categories'
import { ConfirmDeleteCategoryDialog } from '@/components/category/confirm-delete-category-dialog'
import { CreateCategoryDialog } from '@/components/category/create-category.dialog'
import { EditCategoryDialog } from '@/components/category/edit-category-dialog'
import { TablePagination } from '@/components/data-table/pagination'
import { DataTable } from '@/components/data-table/table'
import { DefaultLoader } from '@/components/default-loader'
import { FormattedDate } from '@/components/formatted-date'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCategories } from '@/hooks/categories'
import { usePagination } from '@/hooks/use-pagination'

export const Route = createFileRoute('/app/categories')({
  component: RouteComponent,
})

const DEFAULT_PAGE_SIZE = 5

function useCategoryColumns(): ColumnDef<Category>[] {
  return useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Nombre',
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

function useCategoryTable(categories: Category[] | undefined) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const columns = useCategoryColumns()

  const table = useReactTable({
    data: categories ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
  })

  const paginationInfo = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: DEFAULT_PAGE_SIZE,
  })

  return {
    table,
    paginationInfo,
  }
}

function RouteComponent() {
  const { categories, isLoading } = useCategories()
  const { table, paginationInfo } = useCategoryTable(categories)

  const [isOpenCreateCategory, setIsOpenCreateCategory] = useState(false)

  if (isLoading) {
    return <DefaultLoader />
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading font-semibold text-2xl">Categorías</h1>

        <CreateCategoryDialog
          onOpenChange={setIsOpenCreateCategory}
          open={isOpenCreateCategory}
        />

        <Button
          className="ml-auto"
          onClick={() => setIsOpenCreateCategory(true)}
        >
          <PlusIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
          Crear categoria
        </Button>
      </div>

      <div className="grid gap-4 overflow-hidden">
        <DataTable table={table} />
        <TablePagination paginationInfo={paginationInfo} table={table} />
      </div>
    </>
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
        <ConfirmDeleteCategoryDialog category={category} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
