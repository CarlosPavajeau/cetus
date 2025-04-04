import type { Category } from '@/api/categories'
import { AccessDenied } from '@/components/access-denied'
import { ConfirmDeleteCategoryDialog } from '@/components/confirm-delete-category-dialog'
import { CreateCategoryDialog } from '@/components/create-category.dialog'
import { TablePagination } from '@/components/data-table/pagination'
import { DataTable } from '@/components/data-table/table'
import { DefaultLoader } from '@/components/default-loader'
import { EditCategoryDialog } from '@/components/edit-category-dialog'
import { FormattedDate } from '@/components/formatted-date'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { useCategories } from '@/hooks/categories'
import { usePagination } from '@/hooks/use-pagination'
import { Protect } from '@clerk/clerk-react'
import { createFileRoute } from '@tanstack/react-router'
import {
  type ColumnDef,
  type PaginationState,
  type Row,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { EllipsisIcon, PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

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
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <section className="space-y-4">
        <CreateCategoryDialog
          open={isOpenCreateCategory}
          onOpenChange={setIsOpenCreateCategory}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold font-heading text-2xl text-foreground">
              Categorias
            </h1>
          </div>

          <div>
            <Button
              className="ml-auto"
              onClick={() => setIsOpenCreateCategory(true)}
            >
              <PlusIcon
                className="-ms-1 opacity-60"
                size={16}
                aria-hidden="true"
              />
              Crear categoria
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="overflow-hidden rounded-md border bg-background">
            <DataTable table={table} />
          </div>

          <TablePagination table={table} paginationInfo={paginationInfo} />
        </div>
      </section>
    </Protect>
  )
}

function RowActions({ row }: { row: Row<Category> }) {
  const category = row.original

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
            <EllipsisIcon size={16} aria-hidden={true} />
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
