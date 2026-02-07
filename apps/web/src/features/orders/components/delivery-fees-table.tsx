import type { DeliveryFee } from '@cetus/api-client/types/orders'
import { Skeleton } from '@cetus/ui/skeleton'
import { Currency } from '@cetus/web/components/currency'
import { TablePagination } from '@cetus/web/components/data-table/pagination'
import { DataTable } from '@cetus/web/components/data-table/table'
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

const columns: ColumnDef<DeliveryFee>[] = [
  {
    id: 'city',
    accessorKey: 'city',
    header: 'Ciudad',
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'state',
    accessorKey: 'state',
    header: 'Departamento',
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'fee',
    accessorKey: 'fee',
    header: 'Costo de envío',
    cell: ({ row }) => (
      <div>
        <Currency currency="COP" value={row.getValue('fee')} />
      </div>
    ),
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
]

type Props = {
  deliveryFees?: DeliveryFee[]
}

export function DeliveryFeesTable({ deliveryFees }: Props) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })

  const table = useReactTable({
    columns,
    data: deliveryFees || [],
    pageCount: Math.ceil((deliveryFees?.length || 0) / pagination.pageSize),
    getRowId: (row: DeliveryFee) => row.id,
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
