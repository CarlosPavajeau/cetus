import { Skeleton } from '@cetus/web/components/ui/skeleton'
import { ProfitabilityContent } from '@cetus/web/features/reports/components/profitability-content'
import {
  type FilterState,
  getDefaultFilters,
  ProfitabilityHeader,
} from '@cetus/web/features/reports/components/profitability-header'
import { reportQueries } from '@cetus/web/features/reports/queries'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/app/dashboard/')({
  component: RouteComponent,
})

const SummarySkeleton = (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-25 w-full" />
      <Skeleton className="h-25 w-full" />
      <Skeleton className="h-25 w-full" />
      <Skeleton className="h-25 w-full" />
    </div>
    <Skeleton className="h-[350px] w-full" />
  </div>
)

function RouteComponent() {
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters)

  const { data, isLoading } = useQuery(
    reportQueries.monthlyProfitability({
      preset: filters.preset,
      year: filters.year,
      month: filters.month,
      excludeCanceled: filters.excludeCanceled,
      excludeRefunded: filters.excludeRefunded,
    }),
  )

  return (
    <div className="space-y-4 p-4">
      <ProfitabilityHeader filters={filters} onFiltersChange={setFilters} />
      {isLoading ? SummarySkeleton : null}
      {data ? <ProfitabilityContent data={data} /> : null}
    </div>
  )
}
