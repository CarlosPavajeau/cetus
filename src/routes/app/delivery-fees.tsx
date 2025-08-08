import type { DeliveryFee } from '@/api/orders'
import { Currency } from '@/components/currency'
import { TablePagination } from '@/components/data-table/pagination'
import { DataTable } from '@/components/data-table/table'
import { DefaultLoader } from '@/components/default-loader'
import { CreateDeliveryFeeDialog } from '@/components/order/delivery-fee/create-delivery-fee.dialog'
import { useDeliveryFees } from '@/hooks/orders'
import { usePagination } from '@/hooks/use-pagination'
import { createFileRoute } from '@tanstack/react-router'
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/app/delivery-fees')({
  component: RouteComponent,
})

const DEFAULT_PAGE_SIZE = 5

function useDeliveryFeesColumns(): ColumnDef<DeliveryFee>[] {
  return useMemo(
    () => [
      {
        id: 'city',
        accessorKey: 'city',
        header: 'Ciudad',
      },
      {
        id: 'state',
        accessorKey: 'state',
        header: 'Departamento',
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
      },
    ],
    [],
  )
}

function useDeliveryFeesTable(deliveryFees: DeliveryFee[] | undefined) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const columns = useDeliveryFeesColumns()

  const table = useReactTable({
    data: deliveryFees ?? [],
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
  const { deliveryFees, isLoading } = useDeliveryFees()
  const { table, paginationInfo } = useDeliveryFeesTable(deliveryFees)

  if (isLoading) {
    return <DefaultLoader />
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading font-semibold text-2xl">Costos de envío</h1>

        <CreateDeliveryFeeDialog />
      </div>

      <div className="grid gap-4 overflow-hidden">
        <DataTable table={table} />
        <TablePagination paginationInfo={paginationInfo} table={table} />
      </div>
    </>
  )
}
