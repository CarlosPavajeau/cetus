import type {
  InventoryTransactionQueryParams,
  InventoryTransactionType,
} from '@cetus/api-client/types/products'
import { inventoryTransactionTypeLabels } from '@cetus/shared/constants/inventory'
import { CustomDateRangeInput } from '@cetus/web/components/custom-date-range-input'
import { Button } from '@cetus/web/components/ui/button'
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  Filters,
} from '@cetus/web/components/ui/filters'
import { InventoryMovementsTable } from '@cetus/web/features/products/components/inventory-movements-table'
import { productQueries } from '@cetus/web/features/products/queries'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { PaginationState } from '@tanstack/react-table'
import {
  CalendarIcon,
  FunnelPlusIcon,
  FunnelXIcon,
  TagIcon,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/inventory/')({
  component: RouteComponent,
})

const fields: FilterFieldConfig[] = [
  {
    key: 'transaction_type',
    label: 'Tipo de transacción',
    icon: <TagIcon />,
    type: 'select',
    operators: [
      {
        value: 'is',
        label: 'es',
      },
    ],
    options: [
      ...Object.entries(inventoryTransactionTypeLabels).map(
        ([value, label]) => ({
          value,
          label,
        }),
      ),
    ],
    defaultOperator: 'is',
  },
  {
    key: 'daterange',
    label: 'Fechas',
    icon: <CalendarIcon className="size-3.5" />,
    type: 'custom',
    operators: [{ value: 'between', label: 'entre' }],
    customRenderer: ({ values, onChange }) => (
      <CustomDateRangeInput onChange={onChange} values={values} />
    ),
    defaultOperator: 'between',
  },
]

function RouteComponent() {
  const [filters, setFilters] = useState<Filter[]>([
    createFilter('transaction_type', 'is', ['adjustment']),
  ])

  const transactionsFilters = filters.reduce<Record<string, unknown>>(
    (acc, filter) => {
      if (filter.field === 'daterange') {
        const [from, to] = filter.values ?? []
        if (from) {
          acc.from = from
        }
        if (to) {
          acc.to = to
        }
      } else {
        acc[filter.field] = filter.values
      }
      return acc
    },
    {},
  )

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const queryParams: InventoryTransactionQueryParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    from: transactionsFilters.from
      ? new Date(transactionsFilters.from as string)
      : undefined,
    to: transactionsFilters.to
      ? new Date(transactionsFilters.to as string)
      : undefined,
    type: transactionsFilters.transaction_type as InventoryTransactionType,
  }

  const { data, isLoading } = useQuery(
    productQueries.inventory.transactions(queryParams),
  )

  const items = data?.items ?? (Array.isArray(data) ? data : [])
  const pageCount = data?.totalPages ?? 0

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2">
        <Filters
          addButton={
            <Button mode="icon" size="sm" variant="outline">
              <FunnelPlusIcon />
            </Button>
          }
          fields={fields}
          filters={filters}
          onChange={setFilters}
          size="sm"
        />

        <div className="flex items-center gap-2">
          {filters.length > 0 && (
            <Button onClick={() => setFilters([])} size="xs" variant="outline">
              <FunnelXIcon /> Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      <div className="px-2">
        <InventoryMovementsTable
          data={items}
          isLoading={isLoading}
          onPaginationChange={setPagination}
          pageCount={pageCount}
          pagination={pagination}
        />
      </div>
    </div>
  )
}
