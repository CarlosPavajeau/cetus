import { anonymousClient, authenticatedClient } from '../core/instance'
import type {
  CreateDeliveryFeeRequest,
  CreateOrder,
  DeliveryFee,
  Order,
  OrderInsights,
  OrderPaymentResponse,
  OrderSummary,
  SimpleOrder,
} from '../types/orders'

export const ordersApi = {
  list: () => authenticatedClient.get<SimpleOrder[]>('/orders'),

  getById: (id: string) => authenticatedClient.get<Order>(`/orders/${id}`),

  getInsights: (month: string) =>
    authenticatedClient.get<OrderInsights>('/orders/insights', {
      params: {
        month,
      },
    }),

  summary: (month: string) =>
    authenticatedClient.get<OrderSummary>('/orders/summary', {
      params: {
        month,
      },
    }),

  create: (data: CreateOrder) =>
    anonymousClient.post<SimpleOrder>('/orders', data),

  deliver: (id: string) =>
    authenticatedClient.post<SimpleOrder>(`/orders/${id}/deliver`),

  cancel: (id: string) =>
    authenticatedClient.post<SimpleOrder>(`/orders/${id}/cancel`),

  deliveryFees: {
    list: () => authenticatedClient.get<DeliveryFee[]>('/orders/delivery-fees'),

    getByCity: (cityId: string) =>
      anonymousClient.get<DeliveryFee>(`/orders/delivery-fees/${cityId}`),

    create: (data: CreateDeliveryFeeRequest) =>
      authenticatedClient.post<DeliveryFee>('/orders/delivery-fees', data),
  },

  payments: {
    getByOrderId: (orderId: string) =>
      anonymousClient.get<OrderPaymentResponse>(`/orders/${orderId}/payments`),

    create: (orderId: string) =>
      anonymousClient.post<string>(`/orders/${orderId}/payments`),
  },
}
