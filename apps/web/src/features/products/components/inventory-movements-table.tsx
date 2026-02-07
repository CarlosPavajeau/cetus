import type {
  InventoryTransaction,
  InventoryTransactionType,
} from '@cetus/api-client/types/products'
import { inventoryTransactionTypeLabels } from '@cetus/shared/constants/inventory'
import { Badge, type badgeVariants } from '@cetus/ui/badge'
import { Skeleton } from '@cetus/ui/skeleton'
import { TablePagination } from '@cetus/web/components/data-table/pagination'
import { DataTable } from '@cetus/web/components/data-table/table'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { cn } from '@cetus/web/shared/utils'
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type OnChangeFn,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table'
import type { VariantProps } from 'class-variance-authority'

type Props = {
  data: InventoryTransaction[]
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  pageCount: number
}

const getTransactionBadgeVariant = (
  type: InventoryTransactionType,
  quantity: number,
): VariantProps<typeof badgeVariants>['variant'] => {
  switch (type) {
    case 'sale':
      return 'outline'
    case 'purchase':
    case 'return':
      return 'secondary'
    case 'adjustment':
      return quantity < 0 ? 'destructive' : 'secondary'
    default:
      return 'secondary'
  }
}

const getQuantityColor = (quantity: number) => {
  if (quantity > 0) {
    return 'text-green-500'
  }
  if (quantity < 0) {
    return 'text-red-500'
  }
  return ''
}

const columns: ColumnDef<InventoryTransaction>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Fecha',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        <FormattedDate
          date={new Date(row.getValue('createdAt'))}
          options={{
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }}
        />
      </span>
    ),
    size: 150,
    meta: {
      skeleton: <Skeleton className="h-5 w-36" />,
    },
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue<InventoryTransactionType>('type')
      const quantity = row.original.quantity
      return (
        <Badge variant={getTransactionBadgeVariant(type, quantity)}>
          {inventoryTransactionTypeLabels[type]}
        </Badge>
      )
    },
    size: 100,
    meta: {
      skeleton: <Skeleton className="h-5 w-24" />,
    },
  },
  {
    id: 'productDetails',
    header: 'Producto',
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.productName}</span>
          <span className="text-muted-foreground text-xs">
            {row.original.sku}
          </span>
        </div>
      )
    },
    size: 200,
    meta: {
      skeleton: <Skeleton className="h-5 w-48" />,
    },
  },
  {
    accessorKey: 'quantity',
    header: 'Cantidad',
    cell: ({ row }) => {
      const quantity = row.original.quantity
      return (
        <span className={cn('font-medium', getQuantityColor(quantity))}>
          {quantity > 0 ? `+${quantity}` : quantity}
        </span>
      )
    },
    size: 100,
    meta: {
      skeleton: <Skeleton className="h-5 w-24" />,
    },
  },
  {
    accessorKey: 'stockAfter',
    header: 'Balance',
    size: 100,
    meta: {
      skeleton: <Skeleton className="h-5 w-24" />,
    },
  },
  {
    id: 'reference',
    header: 'Referencia / Razón',
    cell: ({ row }) => {
      const reason = row.original.reason
      const referenceId = row.original.referenceId

      return (
        <div className="flex flex-col text-xs">
          {referenceId && <span className="cursor-pointer">{referenceId}</span>}
          {reason && (
            <span className={cn(referenceId ? 'text-muted-foreground' : '')}>
              {reason}
            </span>
          )}
        </div>
      )
    },
    size: 200,
    meta: {
      skeleton: <Skeleton className="h-5 w-48" />,
    },
  },
]

export function InventoryMovementsTable({
  data,
  pagination,
  onPaginationChange,
  pageCount,
}: Props) {
  const table = useReactTable({
    columns,
    data,
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
