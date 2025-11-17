import type { Category } from '@/api/categories'
import { ConfirmDeleteCategoryDialog } from '@/components/category/confirm-delete-category-dialog'
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
import { useTableWithPagination } from '@/hooks/use-table-with-pagination'
import { CreateCategoryDialog } from '@cetus/features/categories/components/create-category.dialog'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { EllipsisIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/categories')({
  component: RouteComponent,
})

const columns: ColumnDef<Category>[] = [
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
]

function RouteComponent() {
  const { categories, isLoading } = useCategories()
  const { table, paginationInfo } = useTableWithPagination(
    columns,
    categories ?? [],
  )

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
