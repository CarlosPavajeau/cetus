import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  DailySummaryResponse,
  MonthlyProfitabilityResponse,
  ProductProfitabilityItem,
} from '../types/reports'

const definitions = {
  getDailySummary: {
    method: 'GET',
    path: '/reports/daily-summary',
  } as EndpointDefinition<DailySummaryResponse>,
  getMonthlyProfitability: {
    method: 'GET',
    path: '/reports/monthly-profitability',
  } as EndpointDefinition<MonthlyProfitabilityResponse>,
  getProductsProfitabilityRanking: {
    method: 'GET',
    path: '/reports/product-profitability-ranking',
  } as EndpointDefinition<ProductProfitabilityItem[]>,
}

export const reportsApi = defineResource(definitions)
