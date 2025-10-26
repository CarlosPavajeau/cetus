import { anonymousApi, api } from '@/api/client'
import type { CreateOrder } from '@/schemas/orders'
import type { ProductOptionValue } from './products'

export type OrderStatus = 'pending' | 'paid' | 'delivered' | 'canceled'

export const OrderStatusText: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  delivered: 'Enviado',
  canceled: 'Cancelado',
} as const

export const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: OrderStatusText.pending },
  { value: 'paid', label: OrderStatusText.paid },
  {
    value: 'delivered',
    label: OrderStatusText.delivered,
  },
  { value: 'canceled', label: OrderStatusText.canceled },
] as const

export const OrderStatusColor: Record<OrderStatus, string> = {
  pending: 'bg-warning-base',
  paid: 'bg-success-base',
  delivered: 'bg-success-base',
  canceled: 'bg-destructive',
} as const

type OrderItem = {
  id: string
  productName: string
  imageUrl?: string
  quantity: number
  price: number
  variantId: number
  optionValues: ProductOptionValue[]
}

type OrderCustomer = {
  name: string
  email: string
  phone: string
}

export type Order = {
  id: string
  orderNumber: number
  address: string
  city: string
  state: string
  subtotal: number
  discount: number
  deliveryFee?: number
  total: number
  status: OrderStatus
  items: OrderItem[]
  customer: OrderCustomer
  createdAt: string

  transactionId?: string
  storeId: string
}

export const fetchOrder = async (id: string) => {
  const response = await anonymousApi.get<Order>(`/orders/${id}`)

  return response.data
}

export const createOrder = async (order: CreateOrder) => {
  const response = await anonymousApi.post<SimpleOrder>('/orders', order)

  return response.data
}

export type SimpleOrder = {
  id: string
  orderNumber: number
  address: string
  city: string
  state: string
  subtotal: number
  discount: number
  total: number
  status: OrderStatus
  createdAt: string
}

export const fetchOrders = async () => {
  const response = await api.get<SimpleOrder[]>('/orders')

  return response.data
}

export const deliverOrder = async (orderId: string) => {
  const response = await api.post<SimpleOrder>(`/orders/${orderId}/deliver`)

  return response.data
}

export type CancelOrderRequest = {
  id: string
  reason: string
}

export const cancelOrder = async (data: CancelOrderRequest) => {
  const response = await api.post<SimpleOrder>(
    `/orders/${data.id}/cancel`,
    data,
  )

  return response.data
}

export type OrderInsights = {
  currentMonthTotal: number
  revenuePercentageChange: number
  ordersCountPercentageChange: number
  allOrdersCount: number
  completedOrdersCount: number
  customersCount: number
  customerPercentageChange: number
}

export const fetchOrderInsights = async (month: string) => {
  const response = await api.get<OrderInsights>(
    `/orders/insights?month=${month}`,
  )

  return response.data
}

export type OrderSummary = {
  id: string
  status: OrderStatus
  createdAt: string
}

export const fetchOrdersSummary = async (month: string) => {
  const response = await api.get<OrderSummary[]>(
    `/orders/summary?month=${month}`,
  )

  return response.data
}

export type DeliveryFee = {
  id: string
  fee: number
}

export async function fetchDeliveryFee(cityId: string) {
  const response = await anonymousApi.get<DeliveryFee>(
    `/orders/delivery-fees/${cityId}`,
  )

  return response.data
}

export async function fetchDeliveryFees() {
  const response = await api.get<DeliveryFee[]>('/orders/delivery-fees')

  return response.data
}

export type CreateDeliveryFeeRequest = {
  cityId: string
  fee: number
}

export async function createDeliveryFee(deliveryFee: CreateDeliveryFeeRequest) {
  const response = await api.post<DeliveryFee>(
    '/orders/delivery-fees',
    deliveryFee,
  )

  return response.data
}

export async function createOrderPayment(orderId: string) {
  const response = await anonymousApi.post<string>(
    `/orders/${orderId}/payments`,
  )

  return response.data
}

export type PaymentProvider = 'mercado_pago' | 'wompi'

export type OrderPaymentResponse = {
  paymentProvider: PaymentProvider
  transactionId: string
  status: string
  paymentMethod: string
  createdAt?: string
  approvedAt?: string
}

export function getPaymentProviderName(provider: PaymentProvider) {
  switch (provider) {
    case 'mercado_pago':
      return 'Mercado Pago'
    case 'wompi':
      return 'Wompi'
    default:
      return 'Desconocido'
  }
}

export async function fetchOrderPayment(orderId: string) {
  const response = await anonymousApi.get<OrderPaymentResponse>(
    `/orders/${orderId}/payments`,
  )

  return response.data
}
