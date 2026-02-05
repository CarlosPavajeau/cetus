import { authenticatedClient } from '../core/instance'
import type { DailySummaryResponse } from '../types/reports'

export const reportsApi = {
  getDailySummary: (date?: Date) =>
    authenticatedClient.get<DailySummaryResponse>('/reports/daily-summary', {
      params: { date: date?.toISOString() },
    }),
}
