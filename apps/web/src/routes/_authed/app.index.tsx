import { Skeleton } from '@cetus/web/components/ui/skeleton'
import { DailySalesList } from '@cetus/web/features/reports/components/daily-sales-list'
import { DailySummaryContent } from '@cetus/web/features/reports/components/daily-summary-content'
import { DailySummaryDateSelector } from '@cetus/web/features/reports/components/daily-summary-date-selector'
import { api } from '@cetus/web/lib/client-api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createStandardSchemaV1, parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'

const searchParams = {
  date: parseAsString,
}

export const Route = createFileRoute('/_authed/app/')({
  validateSearch: createStandardSchemaV1(searchParams, {
    partialOutput: true,
  }),
  component: RouteComponent,
})

const SummarySkeleton = (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="col-span-full h-44 w-full" />
    </div>
  </div>
)

function RouteComponent() {
  const [dateParam] = useQueryState('date', parseAsString)
  const queryClient = useQueryClient()

  const date = useMemo(
    () =>
      dateParam
        ? new Date(dateParam).toISOString()
        : new Date().toISOString(),
    [dateParam],
  )

  const { data, dataUpdatedAt, refetch, isLoading } = useQuery({
    queryKey: ['reports', 'daily-summary', dateParam ?? 'today'],
    queryFn: () =>
      api.reports.getDailySummary({
        params: { date },
      }),
  })

  const handleRefresh = useCallback(() => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }, [refetch, queryClient])

  return (
    <div className="space-y-6 p-4 md:p-6">
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
