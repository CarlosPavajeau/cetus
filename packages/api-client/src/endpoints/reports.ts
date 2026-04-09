import { authenticatedClient } from '../core/instance'
import type {
  DailySummaryResponse,
  MonthlyProfitabilityRequest,
  MonthlyProfitabilityResponse,
  ProductProfitabilityItem,
} from '../types/reports'

export const reportsApi = {
  getDailySummary: (date?: Date) =>
    authenticatedClient.get<DailySummaryResponse>('/reports/daily-summary', {
      params: { date: date?.toISOString() },
    }),

  getMonthlyProfitability: (params: MonthlyProfitabilityRequest) =>
    authenticatedClient.get<MonthlyProfitabilityResponse>(
      '/reports/monthly-profitability',
      {
        params,
      },
    ),

  getProductsProfitabilityRanking: () =>
    authenticatedClient.get<ProductProfitabilityItem[]>(
      '/reports/product-profitability-ranking',
    ),
}
