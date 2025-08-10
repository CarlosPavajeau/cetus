import type { OrderStatus } from '@/api/orders'
import { StatusFilter } from '@/components/order/app/status-filter'
import { SearchInput } from '@/components/search-input'
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
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <SearchInput onSearch={onSearch} value={searchTerm} />
      <StatusFilter onStatusToggle={onStatusToggle} statuses={statuses} />
    </div>
  ),
)
