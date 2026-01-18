import { anonymousClient, authenticatedClient } from '../core/instance'
import type { PaginatedResponse } from '../types/common'
import type {
  CancelOrderRequest,
  ChangeOrderStatusRequest,
  CreateDeliveryFeeRequest,
  CreateOrder,
  DeliveryFee,
  Order,
  OrderInsights,
  OrderPaymentResponse,
  OrderQueryParams,
  OrderSummary,
  SimpleOrder,
} from '../types/orders'

export const ordersApi = {
  list: (params?: OrderQueryParams) =>
    authenticatedClient.get<PaginatedResponse<SimpleOrder>>('/orders', {
      params,
      paramsSerializer: {
        indexes: null,
      },
    }),

  getById: (id: string) => anonymousClient.get<Order>(`/orders/${id}`),

  getInsights: (month: string) =>
    authenticatedClient.get<OrderInsights>('/orders/insights', {
      params: {
        month,
      },
    }),

  summary: (month: string) =>
    authenticatedClient.get<OrderSummary[]>('/orders/summary', {
      params: {
        month,
      },
    }),

  create: (data: CreateOrder) =>
    anonymousClient.post<SimpleOrder>('/orders', data),

  deliver: (id: string) =>
    authenticatedClient.post<SimpleOrder>(`/orders/${id}/deliver`),

  cancel: (data: CancelOrderRequest) =>
    authenticatedClient.post<SimpleOrder>(`/orders/${data.id}/cancel`, data),

  updateStatus: (data: ChangeOrderStatusRequest) =>
    authenticatedClient.put<void>(`/orders/${data.orderId}/status`, data),

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
