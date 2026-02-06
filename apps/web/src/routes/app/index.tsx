import { api } from '@cetus/api-client'
import { Skeleton } from '@cetus/web/components/ui/skeleton'
import { DailySalesList } from '@cetus/web/features/reports/components/daily-sales-list'
import { DailySummaryContent } from '@cetus/web/features/reports/components/daily-summary-content'
import { DailySummaryDateSelector } from '@cetus/web/features/reports/components/daily-summary-date-selector'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createStandardSchemaV1, parseAsString, useQueryState } from 'nuqs'
import { useCallback } from 'react'

const searchParams = {
  date: parseAsString,
}

export const Route = createFileRoute('/app/')({
  validateSearch: createStandardSchemaV1(searchParams, {
    partialOutput: true,
  }),
  component: RouteComponent,
})

const SummarySkeleton = (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Skeleton className="h-25 w-full" />
    <Skeleton className="h-25 w-full" />
    <Skeleton className="h-25 w-full" />
    <Skeleton className="h-25 w-full" />
  </div>
)

function RouteComponent() {
  const [dateParam] = useQueryState('date', parseAsString)
  const queryClient = useQueryClient()

  const { data, dataUpdatedAt, refetch, isLoading } = useQuery({
    queryKey: ['reports', 'daily-summary', dateParam ?? 'today'],
    queryFn: () =>
      api.reports.getDailySummary(dateParam ? new Date(dateParam) : undefined),
  })

  const handleRefresh = useCallback(() => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }, [refetch, queryClient])

  return (
    <div className="space-y-4 p-4">
      <DailySummaryDateSelector
        dataUpdatedAt={dataUpdatedAt}
        onRefresh={handleRefresh}
      />

      {isLoading ? SummarySkeleton : null}
      {data ? <DailySummaryContent data={data} /> : null}
      <DailySalesList />
    </div>
  )
}
