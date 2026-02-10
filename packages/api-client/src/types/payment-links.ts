export type CreatePaymentLinkRequest = {
  orderId: string
  expirationHours?: number
}

export type PaymentLinkStatus = 'active' | 'paid' | 'expired'

export type PaymentLink = {
  id: string
  orderId: string
  token: string
  url: string
  status: PaymentLinkStatus
  expiresAt: string
  createdAt: string
  timeRemaining?: number
}

export type PaymentLinkReasons =
  | 'order_already_paid'
  | 'order_cancelled'
  | 'active_link_exists'

export type PaymentLinkState = {
  canGenerateLink: boolean
  reason?: PaymentLinkReasons
  activeLink?: PaymentLink
}
