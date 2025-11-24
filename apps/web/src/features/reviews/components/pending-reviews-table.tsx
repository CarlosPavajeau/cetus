import type { PendingForApprovalProductReview } from '@cetus/api-client/types/reviews'
import { DataGrid, DataGridContainer } from '@cetus/ui/data-grid'
import { DataGridPagination } from '@cetus/ui/data-grid-pagination'
import { DataGridTable } from '@cetus/ui/data-grid-table'
import { ScrollArea, ScrollBar } from '@cetus/ui/scroll-area'
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
    cell: ({ row }) => <ProcessReviewDialog review={row.original} />,
  },
]

type Props = {
  reviews?: PendingForApprovalProductReview[]
  isLoading: boolean
}

export function PendingReviewsTable({ reviews, isLoading }: Readonly<Props>) {
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
    <DataGrid
      isLoading={isLoading}
      recordCount={reviews?.length || 0}
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
