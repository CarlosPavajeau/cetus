import { anonymousClient, authenticatedClient } from '../core/instance'
import type { PaginatedResponse } from '../types/common'
import type {
  CancelOrderRequest,
  ChangeOrderStatusRequest,
  CreateDeliveryFeeRequest,
  CreateOrder,
  CreateSale,
  DeliveryFee,
  Order,
  OrderInsights,
  OrderPaymentResponse,
  OrderQueryParams,
  OrderSummary,
  OrderTimeline,
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

  timeline: (orderId: string) =>
    anonymousClient.get<OrderTimeline[]>(`/orders/${orderId}/timeline`),

  create: (data: CreateOrder) =>
    anonymousClient.post<SimpleOrder>('/orders', data),

  createSale: (data: CreateSale) =>
    authenticatedClient.post<SimpleOrder>('/sales', data),

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

    createMercadoPagoPreference: (orderId: string) =>
      anonymousClient.post<string>(
        `/orders/${orderId}/payment-providers/mercado-pago/preference`,
      ),

    generateWompiIntegritySignature: (orderId: string) =>
      anonymousClient.get<string>(
        `/orders/${orderId}/payment-providers/wompi/integrity-signature`,
      ),
  },
}
