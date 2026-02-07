import type { Coupon } from '@cetus/api-client/types/coupons'
import { couponDiscountTypeLabels } from '@cetus/shared/constants/coupon'
import { Skeleton } from '@cetus/ui/skeleton'
import { TablePagination } from '@cetus/web/components/data-table/pagination'
import { DataTable } from '@cetus/web/components/data-table/table'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { CouponDetails } from '@cetus/web/features/coupons/components/coupon-details'
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

const columns: ColumnDef<Coupon>[] = [
  {
    id: 'code',
    header: 'Código',
    cell: ({ row }) => <p className="font-medium">{row.original.code}</p>,
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'discountType',
    header: 'Tipo de descuento',
    cell: ({ row }) => (
      <p>{couponDiscountTypeLabels[row.original.discountType]}</p>
    ),
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'usageLimit',
    header: 'Límite de usos',
    cell: ({ row }) => (
      <p>
        {row.original.usageLimit
          ? `${row.original.usageLimit} usos`
          : 'Sin límite'}
      </p>
    ),
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'usageCount',
    header: 'Usos',
    cell: ({ row }) => <p>{row.original.usageCount}</p>,
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'isActive',
    header: 'Activo',
    cell: ({ row }) => <p>{row.original.isActive ? 'Sí' : 'No'}</p>,
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'createdAt',
    header: 'Creado el',
    cell: ({ row }) => (
      <FormattedDate date={new Date(row.original.createdAt)} />
    ),
    meta: {
      skeleton: <Skeleton className="h-5 w-32" />,
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => <CouponDetails coupon={row.original} />,
    meta: {
      skeleton: <Skeleton className="h-5 w-8" />,
    },
  },
]

type Props = {
  coupons?: Coupon[]
}

export function CouponsTable({ coupons }: Props) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })

  const table = useReactTable({
    columns,
    data: coupons || [],
    pageCount: Math.ceil((coupons?.length || 0) / pagination.pageSize),
    getRowId: (row: Coupon) => row.id.toString(),
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
