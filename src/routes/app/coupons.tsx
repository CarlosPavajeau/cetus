import { type Coupon, CouponDiscountTypeText } from '@/api/coupons'
import { AccessDenied } from '@/components/access-denied'
import { TablePagination } from '@/components/data-table/pagination'
import { DataTable } from '@/components/data-table/table'
import { DefaultLoader } from '@/components/default-loader'
import { FormattedDate } from '@/components/formatted-date'
import { Button } from '@/components/ui/button'
import { useCoupons } from '@/hooks/coupons'
import { usePagination } from '@/hooks/use-pagination'
import { Protect } from '@clerk/clerk-react'
import { createFileRoute } from '@tanstack/react-router'
import {
  type ColumnDef,
  type PaginationState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/coupons')({
  component: RouteComponent,
})

const DEFAULT_PAGE_SIZE = 5

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
]

function useCouponsTable(coupons: Coupon[] | undefined) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const table = useReactTable({
    data: coupons ?? [],
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
  const { coupons, isLoading } = useCoupons()
  const { table, paginationInfo } = useCouponsTable(coupons)

  if (isLoading) {
    return <DefaultLoader />
  }

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading font-semibold text-2xl">Cupones</h1>

        <Button disabled>
          <PlusIcon />
          Crear cupón
        </Button>
      </div>

      <div className="grid gap-4 overflow-hidden">
        <DataTable table={table} />
        <TablePagination table={table} paginationInfo={paginationInfo} />
      </div>
    </Protect>
  )
}
