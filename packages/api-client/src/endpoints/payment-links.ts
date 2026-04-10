import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  CreatePaymentLinkRequest,
  PaymentLink,
  PaymentLinkState,
} from '../types/payment-links'

const definitions = {
  create: {
    method: 'POST',
    path: (id: string) => `/orders/${id}/payment-link`,
  } as EndpointDefinition<PaymentLink, CreatePaymentLinkRequest, string>,
  getByToken: {
    method: 'GET',
    path: (token: string) => `/payment-links/${token}`,
  } as EndpointDefinition<PaymentLink, void, string>,
  getState: {
    method: 'GET',
    path: (orderId: string) => `/orders/${orderId}/payment-link`,
  } as EndpointDefinition<PaymentLinkState, void, string>,
}

export const paymentLinksApi = defineResource(definitions)
