import axios from 'axios'

export enum OrderStatus {
  Pending,
  Paid,
  Delivered,
  Canceled,
}

export const OrderStatusText = {
  [OrderStatus.Pending]: 'Pendiente',
  [OrderStatus.Paid]: 'Pagado',
  [OrderStatus.Delivered]: 'Enviado',
  [OrderStatus.Canceled]: 'Cancelado',
}

export const ORDER_STATUS_OPTIONS = [
  { value: OrderStatus.Pending, label: OrderStatusText[OrderStatus.Pending] },
  { value: OrderStatus.Paid, label: OrderStatusText[OrderStatus.Paid] },
  {
    value: OrderStatus.Delivered,
    label: OrderStatusText[OrderStatus.Delivered],
  },
  { value: OrderStatus.Canceled, label: OrderStatusText[OrderStatus.Canceled] },
]

export const OrderStatusColor = {
  [OrderStatus.Pending]: 'bg-warning-base',
  [OrderStatus.Paid]: 'bg-success-base',
  [OrderStatus.Delivered]: 'bg-success-base',
  [OrderStatus.Canceled]: 'bg-destructive',
}

export type Order = {
  id: string
  orderNumber: number
  address: string
  subtotal: number
  discount: number
  deliveryFee?: number
  total: number
  status: OrderStatus
  items: {
    id: string
    productName: string
    imageUrl?: string
    quantity: number
    price: number
  }[]
  customer: {
    name: string
    email: string
    phone: string
  }
  createdAt: string

  transactionId?: string
}

export const fetchOrder = async (id: string) => {
  const response = await axios.get<Order>(
    `${import.meta.env.PUBLIC_API_URL}/orders/${id}`,
  )

  return response.data
}

export type CreateOrderRequest = {
  address: string
  cityId: string
  total: number
  items: {
    productName: string
    imageUrl?: string
    productId: string
    quantity: number
    price: number
  }[]
  customer: {
    id: string
    name: string
    email: string
    phone: string
    address: string
  }
}

export const createOrder = async (
  order: CreateOrderRequest,
  storeSlug?: string,
) => {
  const response = await axios.post<SimpleOrder>(
    `${import.meta.env.PUBLIC_API_URL}/orders${storeSlug ? `?store=${storeSlug}` : ''}`,
    order,
  )

  return response.data
}

export type SimpleOrder = {
  id: string
  orderNumber: number
  address: string
  subtotal: number
  discount: number
  total: number
  status: OrderStatus
  createdAt: string
}

export const fetchOrders = async (storeSlug?: string) => {
  const response = await axios.get<SimpleOrder[]>(
    `${import.meta.env.PUBLIC_API_URL}/orders${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export const deliverOrder = async (orderId: string) => {
  const response = await axios.post<SimpleOrder>(
    `${import.meta.env.PUBLIC_API_URL}/orders/${orderId}/deliver`,
  )

  return response.data
}

export const cancelOrder = async (orderId: string) => {
  const response = await axios.post<SimpleOrder>(
    `${import.meta.env.PUBLIC_API_URL}/orders/${orderId}/cancel`,
  )

  return response.data
}

export type OrderInsights = {
  currentMonthTotal: number
  currentMonthCost: number
  allOrdersCount: number
  completedOrdersCount: number
  revenuePercentageChange: number
  ordersCountPercentageChange: number
}

export const fetchOrderInsights = async (month: string, storeSlug?: string) => {
  const response = await axios.get<OrderInsights>(
    `${import.meta.env.PUBLIC_API_URL}/orders/insights?month=${month}${storeSlug ? `&store=${storeSlug}` : ''}`,
  )

  return response.data
}

export type OrderSummary = {
  id: string
  status: OrderStatus
  createdAt: string
}

export const fetchOrdersSummary = async (month: string, storeSlug?: string) => {
  const response = await axios.get<OrderSummary[]>(
    `${import.meta.env.PUBLIC_API_URL}/orders/summary?month=${month}${storeSlug ? `&store=${storeSlug}` : ''}`,
  )

  return response.data
}

export type DeliveryFee = {
  id: string
  fee: number
}

export async function fetchDeliveryFee(cityId: string, storeSlug?: string) {
  const response = await axios.get<DeliveryFee>(
    `${import.meta.env.PUBLIC_API_URL}/orders/delivery-fees/${cityId}${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export async function fetchDeliveryFees(storeSlug?: string) {
  const response = await axios.get<DeliveryFee[]>(
    `${import.meta.env.PUBLIC_API_URL}/orders/delivery-fees${storeSlug ? `?store=${storeSlug}` : ''}`,
  )

  return response.data
}

export type CreateDeliveryFeeRequest = {
  cityId: string
  fee: number
}

export async function createDeliveryFee(
  deliveryFee: CreateDeliveryFeeRequest,
  storeSlug?: string,
) {
  const response = await axios.post<DeliveryFee>(
    `${import.meta.env.PUBLIC_API_URL}/orders/delivery-fees${storeSlug ? `?store=${storeSlug}` : ''}`,
    deliveryFee,
  )

  return response.data
}
