import { CouponDiscountTypeText } from '@/api/coupons'
import type { Coupon } from '@cetus/api-client/types/coupons'
import { DataGrid, DataGridContainer } from '@cetus/ui/data-grid'
import { DataGridPagination } from '@cetus/ui/data-grid-pagination'
import { DataGridTable } from '@cetus/ui/data-grid-table'
import { ScrollArea, ScrollBar } from '@cetus/ui/scroll-area'
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
  },
  {
    id: 'discountType',
    header: 'Tipo de descuento',
    cell: ({ row }) => (
      <p>{CouponDiscountTypeText[row.original.discountType]}</p>
    ),
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
  },
  {
    id: 'usageCount',
    header: 'Usos',
    cell: ({ row }) => <p>{row.original.usageCount}</p>,
  },
  {
    id: 'isActive',
    header: 'Activo',
    cell: ({ row }) => <p>{row.original.isActive ? 'Sí' : 'No'}</p>,
  },
  {
    id: 'createdAt',
    header: 'Creado el',
    cell: ({ row }) => (
      <FormattedDate date={new Date(row.original.createdAt)} />
    ),
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => <CouponDetails coupon={row.original} />,
  },
]

type Props = {
  coupons?: Coupon[]
  isLoading: boolean
}

export function CouponsTable({ coupons, isLoading }: Props) {
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
    <DataGrid
      isLoading={isLoading}
      recordCount={coupons?.length || 0}
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
