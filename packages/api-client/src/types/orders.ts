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

  cancellationReason?: string
  cancelledAt?: string
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
  userId?: string
  notes?: string
  paymentMethod?: PaymentMethod
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
