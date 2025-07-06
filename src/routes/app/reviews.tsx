import type { PendingForApprovalProductReview } from '@/api/reviews'
import { AccessDenied } from '@/components/access-denied'
import { TablePagination } from '@/components/data-table/pagination'
import { DataTable } from '@/components/data-table/table'
import { DefaultLoader } from '@/components/default-loader'
import { FormattedDate } from '@/components/formatted-date'
import { ProcessProductReview } from '@/components/reviews/process-product-review'
import { usePendingForApprovalProductReviews } from '@/hooks/reviews'
import { usePagination } from '@/hooks/use-pagination'
import { Protect, useOrganization } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

export const Route = createFileRoute('/app/reviews')({
  component: RouteComponent,
})

const DEFAULT_PAGE_SIZE = 5

const columns: ColumnDef<PendingForApprovalProductReview>[] = [
  {
    id: 'product',
    header: 'Producto',
    cell: ({ row }) => (
      <p className="font-medium">{row.original.product.name}</p>
    ),
  },
  {
    id: 'customer',
    accessorKey: 'customer',
    header: 'Cliente',
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Fecha',
    cell: ({ row }) => (
      <div>
        <FormattedDate date={new Date(row.original.createdAt)} />
      </div>
    ),
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => <ProcessProductReview review={row.original} />,
  },
]

function useReviewsTable(
  reviews: PendingForApprovalProductReview[] | undefined,
) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const table = useReactTable({
    data: reviews ?? [],
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
  const org = useOrganization()
  const { pendingForApprovalProductReviews, isLoading } =
    usePendingForApprovalProductReviews(org.organization?.slug ?? undefined)
  const { table, paginationInfo } = useReviewsTable(
    pendingForApprovalProductReviews,
  )

  if (isLoading) {
    return <DefaultLoader />
  }

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading font-semibold text-2xl">
          Reseñas pendientes de aprobación
        </h1>
      </div>

      <div className="grid gap-4 overflow-hidden">
        <DataTable table={table} />
        <TablePagination table={table} paginationInfo={paginationInfo} />
      </div>
    </Protect>
  )
}
