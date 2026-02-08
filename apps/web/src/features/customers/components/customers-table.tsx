import type { CustomerSummaryResponse } from '@cetus/api-client/types/customers'
import { Button } from '@cetus/ui/button'
import { Currency } from '@cetus/web/components/currency'
import { TablePagination } from '@cetus/web/components/data-table/pagination'
import { DataTable } from '@cetus/web/components/data-table/table'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { EyeIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  type OnChangeFn,
  type PaginationState,
  type Row,
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
    cell: ({ row }) => {
      const lastPurchase = row.getValue('lastPurchase')
      return lastPurchase ? (
        <FormattedDate date={new Date(lastPurchase as string)} />
      ) : (
        <span>-</span>
      )
    },
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <RowActions row={row} />,
    size: 60,
    enableHiding: false,
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

function RowActions({ row }: { row: Row<CustomerSummaryResponse> }) {
  return (
    <Button asChild size="icon" variant="ghost">
      <Link
        params={{ customerId: row.original.id }}
        to="/app/customers/$customerId"
      >
        <HugeiconsIcon icon={EyeIcon} />
      </Link>
    </Button>
  )
}
