import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type { PaginatedResponse } from '../types/common'
import type {
  ChangeOrderStatusRequest,
  CreateOrder,
  CreateSale,
  Order,
  OrderInsights,
  OrderSummary,
  OrderTimeline,
  SimpleOrder,
} from '../types/orders'

const definitions = {
  list: {
    method: 'GET',
    path: '/orders',
  } as EndpointDefinition<PaginatedResponse<SimpleOrder>, void>,

  getById: {
    method: 'GET',
    path: (id: string) => `/orders/${id}`,
  } as EndpointDefinition<Order, void, string>,

  getInsights: {
    method: 'GET',
    path: '/orders/insights',
  } as EndpointDefinition<OrderInsights>,

  summary: {
    method: 'GET',
    path: '/orders/summary',
  } as EndpointDefinition<OrderSummary[]>,

  timeline: {
    method: 'GET',
    path: (orderId: string) => `/orders/${orderId}/timeline`,
  } as EndpointDefinition<OrderTimeline[], void, string>,

  create: {
    method: 'POST',
    path: '/orders',
  } as EndpointDefinition<SimpleOrder, CreateOrder>,

  createSale: {
    method: 'POST',
    path: '/sales',
  } as EndpointDefinition<SimpleOrder, CreateSale>,

  updateStatus: {
    method: 'PUT',
    path: (id: string) => `/orders/${id}/status`,
  } as EndpointDefinition<Order, ChangeOrderStatusRequest, string>,
}

export const ordersApi = defineResource(definitions)
