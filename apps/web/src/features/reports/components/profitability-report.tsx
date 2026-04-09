import { useQuery } from '@tanstack/react-query'
import { reportQueries } from '../queries'
import {
  getDefaultFilters,
  ProfitabilityHeader,
  type FilterState,
} from './profitability-header'
import { useState } from 'react'
import { Skeleton } from '@cetus/web/components/ui/skeleton'
import { ProfitabilityContent } from './profitability-content'

export function ProfitabilityReport() {
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters)
  const { data, isLoading } = useQuery(
    reportQueries.monthlyProfitability(filters),
  )

  return (
    <div className="space-y-4">
      <ProfitabilityHeader filters={filters} onFiltersChange={setFilters} />
      {isLoading ? PendingComponent : null}
      {data ? <ProfitabilityContent data={data} /> : null}
    </div>
  )
}

const PendingComponent = (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-25 w-full" />
      <Skeleton className="h-25 w-full" />
      <Skeleton className="h-25 w-full" />
      <Skeleton className="h-25 w-full" />
    </div>
    <Skeleton className="h-87.5 w-full" />
  </div>
)
