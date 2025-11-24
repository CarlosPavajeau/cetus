import { orderStatusLabels } from '@cetus/shared/constants/order'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { CustomDateRangeInput } from '@cetus/web/components/custom-date-range-input'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { Button } from '@cetus/web/components/ui/button'
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  Filters,
} from '@cetus/web/components/ui/filters'
import { OrdersList } from '@cetus/web/features/orders/components/orders-list'
import { orderQueries } from '@cetus/web/features/orders/queries'
import { useOrderRealtime } from '@cetus/web/hooks/orders/use-order-realtime'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  CalendarIcon,
  FunnelPlusIcon,
  FunnelXIcon,
  PackageXIcon,
  RefreshCwIcon,
  TagIcon,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

const EmptyState = () => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <PackageXIcon />
      </EmptyMedia>
      <EmptyTitle>No hay pedidos</EmptyTitle>
      <EmptyDescription>
        No hay pedidos disponibles con los filtros aplicados
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
)

const fields: FilterFieldConfig[] = [
  {
    key: 'statuses',
    label: 'Estado',
    icon: <TagIcon />,
    type: 'multiselect',
    className: 'w-[180px]',
    operators: [
      {
        value: 'is_any_of',
        label: 'cualquiera de',
      },
    ],
    options: [
      ...Object.entries(orderStatusLabels).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    defaultOperator: 'is_any_of',
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
  useOrderRealtime()

  const [filters, setFilters] = useState<Filter[]>([
    createFilter('statuses', 'is_any_of', ['pending', 'paid']),
  ])

  const orderFilters = filters.reduce<Record<string, unknown>>(
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

  const { data, isLoading } = useQuery(orderQueries.list(orderFilters))

  const queryClient = useQueryClient()
  const refresh = () => {
    queryClient.invalidateQueries(orderQueries.list(orderFilters))
  }

  const orders = data?.items || []
  const isEmpty = !orders || orders.length === 0

  const content = () => {
    if (isLoading) {
      return <DefaultLoader />
    }

    if (isEmpty) {
      return <EmptyState />
    }

    return <OrdersList orders={orders} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
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

          <Button onClick={refresh} size="xs" variant="outline">
            <RefreshCwIcon aria-hidden="true" />
            Recargar
          </Button>
        </div>
      </div>

      <div className="px-4">{content()}</div>
    </div>
  )
}
