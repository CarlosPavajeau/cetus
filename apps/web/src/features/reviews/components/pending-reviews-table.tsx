import type { PendingForApprovalProductReview } from '@cetus/api-client/types/reviews'
import { Skeleton } from '@cetus/ui/skeleton'
import { TablePagination } from '@cetus/web/components/data-table/pagination'
import { DataTable } from '@cetus/web/components/data-table/table'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ProcessReviewDialog } from './process-review.dialog'

const columns: ColumnDef<PendingForApprovalProductReview>[] = [
  {
    id: 'product',
    header: 'Producto',
    cell: ({ row }) => (
      <p className="font-medium">{row.original.product.name}</p>
    ),
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'customer',
    accessorKey: 'customer',
    header: 'Cliente',
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
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
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => <ProcessReviewDialog review={row.original} />,
    meta: {
      skeleton: <Skeleton className="h-5 w-8" />,
    },
  },
]

type Props = {
  reviews?: PendingForApprovalProductReview[]
}

export function PendingReviewsTable({ reviews }: Readonly<Props>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })

  const table = useReactTable({
    columns,
    data: reviews || [],
    pageCount: Math.ceil((reviews?.length || 0) / pagination.pageSize),
    getRowId: (row: PendingForApprovalProductReview) => row.id,
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
