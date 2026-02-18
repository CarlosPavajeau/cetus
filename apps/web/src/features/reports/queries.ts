import { api } from '@cetus/api-client'
import type { MonthlyProfitabilityRequest } from '@cetus/api-client/types/reports'
import { createQueryKeys } from '@cetus/web/lib/query/create-query-keys'
import { queryOptions } from '@tanstack/react-query'

export const reportKeys = createQueryKeys('reports')

export const reportQueries = {
  monthlyProfitability: (params: MonthlyProfitabilityRequest) =>
    queryOptions({
      queryKey: [...reportKeys.lists(), 'monthly-profitability', params],
      queryFn: () => api.reports.getMonthlyProfitability(params),
    }),
}
