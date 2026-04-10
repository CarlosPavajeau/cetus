import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type { OrderPaymentResponse } from '../types/orders'

const definitions = {
  getByOrderId: {
    method: 'GET',
    path: (orderId: string) => `/orders/${orderId}/payments`,
  } as EndpointDefinition<OrderPaymentResponse, void, string>,

  createMercadoPagoPreference: {
    method: 'POST',
    path: (orderId: string) =>
      `/orders/${orderId}/payment-providers/mercado-pago/preference`,
  } as EndpointDefinition<string, void, string>,

  generateWompiIntegritySignature: {
    method: 'GET',
    path: (orderId: string) =>
      `/orders/${orderId}/payment-providers/wompi/integrity-signature`,
  } as EndpointDefinition<string, void, string>,
}

export const paymentsApi = defineResource(definitions)
