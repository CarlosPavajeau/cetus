import type { ProductOptionValue } from './products'

export type OrderStatus = 'pending' | 'paid' | 'delivered' | 'canceled'

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

export type CancelOrderRequest = {
  id: string
  reason: string
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

export type OrderSummary = {
  id: string
  status: OrderStatus
  createdAt: string
}

export type DeliveryFee = {
  id: string
  fee: number
}

export type CreateDeliveryFeeRequest = {
  cityId: string
  fee: number
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

export type CreateOrder = {
  address: string
  cityId: string
  total: number
  items: {
    productName: string
    variantId: number
    quantity: number
    price: number
    imageUrl?: string
  }[]
  customer: {
    id: string
    name: string
    email: string
    phone: string
    address: string
  }
}

export type OrderQueryParams = {
  statuses?: OrderStatus[]
  [key: string]: unknown
}
