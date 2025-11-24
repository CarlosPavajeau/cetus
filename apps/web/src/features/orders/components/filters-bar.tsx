import type { OrderStatus } from '@cetus/api-client/types/orders'
import { SearchInput } from '@cetus/web/components/search-input'
import { StatusFilter } from '@cetus/web/features/orders/components/status-filter'
import { memo } from 'react'

export const FiltersBar = memo(
  ({
    searchTerm,
    statuses,
    onSearch,
    onStatusToggle,
  }: {
    searchTerm: string
    statuses: OrderStatus[]
    onSearch: (term: string) => void
    onStatusToggle: (status: OrderStatus) => void
  }) => (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput onSearch={onSearch} value={searchTerm} />
      <StatusFilter onStatusToggle={onStatusToggle} statuses={statuses} />
    </div>
  ),
)
