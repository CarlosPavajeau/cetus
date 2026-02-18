import type { OrderChannel, PaymentStatus } from './orders'

export type PaymentStatusMetrics = {
  status: PaymentStatus
  orderCount: number
  revenue: number
  percentage: number
}

export type ChannelMetrics = {
  channel: OrderChannel
  orderCount: number
  revenue: number
  percentage: number
}

export type OrdersMetrics = {
  total: number
  confirmed: number
  pending: number
  awaitingVerification: number
  rejected: number
  canceled: number
}

export type RevenueMetrics = {
  confirmed: number
  pending: number
  total: number
}

export type TopProductItem = {
  productId: string
  productName: string
  imageUrl?: string | null
  quantitySold: number
  revenue: number
}

export type DailySummaryResponse = {
  date: string
  orders: OrdersMetrics
  revenue: RevenueMetrics
  topProduct?: TopProductItem | null
  byChannel: ChannelMetrics[]
  byPaymentStatus: PaymentStatusMetrics[]
}

export type ProfitabilitySummary = {
  totalSales: number
  totalCost: number
  grossProfit: number
  marginPercentage: number
}

export type MonthComparison = {
  salesChange: number
  profitChange: number
  marginChange: number
}

export type MonthlyTrend = {
  year: number
  month: number
  totalSales: number
  totalCost: number
  grossProfit: number
  marginPercentage: number
}

export type ProductCostWarning = {
  productId: string
  productName: string
  variantId: number
  sku: string
}

export type MonthlyProfitabilityResponse = {
  summary: ProfitabilitySummary
  comparisonSummary?: ProfitabilitySummary
  previousMonthComparison?: MonthComparison
  trend: MonthlyTrend[]
  productsWithoutCost: ProductCostWarning[]
}

  export type PeriodPreset = 'this_month' | 'last_month' | 'specific_month'

export type MonthlyProfitabilityRequest = {
  preset: PeriodPreset
  year?: number
  month?: number
  excludeCanceled?: boolean
  excludeRefunded?: boolean
}
