import { anonymousClient, authenticatedClient } from '../core/instance'
import type {
  CreatePaymentLinkRequest,
  PaymentLink,
  PaymentLinkState,
} from '../types/payment-links'

export const paymentLinksApi = {
  create: (data: CreatePaymentLinkRequest) =>
    authenticatedClient.post<PaymentLink>(
      `/orders/${data.orderId}/payment-link`,
      data,
    ),

  getByToken: (token: string) =>
    anonymousClient.get<PaymentLink>(`/payment-links/${token}`),

  getState: (orderId: string) =>
    authenticatedClient.get<PaymentLinkState>(
      `/orders/${orderId}/payment-link`,
    ),
}
