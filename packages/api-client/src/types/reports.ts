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
  date: Date
  orders: OrdersMetrics
  revenue: RevenueMetrics
  topProduct?: TopProductItem | null
  byChannel: ChannelMetrics[]
  byPaymentStatus: PaymentStatusMetrics[]
}
