import type { CustomerSummaryResponse } from '@cetus/api-client/types/customers'
import { Currency } from '@cetus/web/components/currency'
import { TablePagination } from '@cetus/web/components/data-table/pagination'
import { DataTable } from '@cetus/web/components/data-table/table'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type OnChangeFn,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table'

const columns: ColumnDef<CustomerSummaryResponse>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'totalOrders',
    header: 'Total de pedidos',
  },
  {
    accessorKey: 'totalSpent',
    header: 'Total gastado',
    cell: ({ row }) => (
      <Currency currency="COP" value={row.getValue('totalSpent')} />
    ),
  },
  {
    accessorKey: 'lastPurchase',
    header: 'Última compra',
    cell: ({ row }) => (
      <FormattedDate date={new Date(row.getValue('lastPurchase'))} />
    ),
  },
]

type Props = {
  data?: CustomerSummaryResponse[]
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  pageCount: number
}

export function CustomersTable({
  data,
  pagination,
  onPaginationChange,
  pageCount,
}: Props) {
  const table = useReactTable({
    columns,
    data: data ?? [],
    pageCount,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    onPaginationChange,
    state: {
      pagination,
    },
  })

  return (
    <div className="grid gap-4 overflow-hidden">
      <DataTable table={table} />
      <TablePagination table={table} />
    </div>
  )
}
