import type { DocumentType } from './customers'
import type { ProductOptionValue } from './products'

export type OrderStatus =
  | 'pending_payment'
  | 'payment_confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'delivered'
  | 'failed_delivery'
  | 'canceled'
  | 'returned'

export type OrderItem = {
  id: string
  productName: string
  imageUrl?: string
  quantity: number
  price: number
  variantId: number
  optionValues: ProductOptionValue[]
}

export type OrderCustomer = {
  name: string
  email: string
  phone: string
}

export type Order = {
  id: string
  orderNumber: number
  status: OrderStatus
  address?: string
  city: string
  state: string

  subtotal: number
  discount: number
  deliveryFee?: number
  total: number

  items: OrderItem[]

  customer: OrderCustomer

  channel: OrderChannel
  paymentStatus: PaymentStatus
  paymentProvider?: PaymentProvider
  paymentMethod: PaymentMethod

  transactionId?: string
  storeId: string

  cancelledAt?: string
  cancellationReason?: string

  createdAt: string
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

export type ChangeOrderStatusRequest = {
  orderId: string
  newStatus: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  userId?: string
  notes?: string
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

export type PaymentProvider = 'manual' | 'mercado_pago' | 'wompi'

export type PaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'pse'
  | 'cash_reference'
  | 'cash_on_delivery'
  | 'bank_transfer'
  | 'nequi'

export type OrderPaymentResponse = {
  paymentProvider: PaymentProvider
  transactionId: string
  status: string
  paymentMethod: string
  createdAt?: string
  approvedAt?: string
}

export type CreateOrderItem = {
  variantId: number
  quantity: number
}

export type CreateOrderCustomer = {
  phone: string
  name: string
  email?: string
  documentType?: DocumentType
  documentNumber?: string
}

export type CreateOrderShipping = {
  address: string
  cityId: string
}

export type CreateOrder = {
  items: CreateOrderItem[]
  customer: CreateOrderCustomer
  shipping: CreateOrderShipping
}

export type OrderChannel =
  | 'ecommerce'
  | 'whatsapp'
  | 'messenger'
  | 'in_store'
  | 'other'

export type SaleChannel = 'whatsapp' | 'messenger' | 'in_store' | 'other'

export type PaymentStatus =
  | 'pending'
  | 'awaiting_verification'
  | 'verified'
  | 'rejected'
  | 'refunded'

export type CreateSale = {
  items: CreateOrderItem[]
  customer: CreateOrderCustomer
  channel: SaleChannel
  paymentMethod: 'nequi' | 'bank_transfer' | 'cash_on_delivery'
  shipping?: CreateOrderShipping
  paymentStatus: PaymentStatus
}

export type OrderQueryParams = {
  page?: number
  pageSize?: number
  statuses?: OrderStatus[]
  from?: string
  to?: string
}

export type OrderTimeline = {
  id: string
  fromStatus?: OrderStatus
  toStatus: OrderStatus
  createdAt: string
  changedById?: string
  notes?: string
}
