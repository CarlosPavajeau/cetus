import { anonymousClient, authenticatedClient } from '../core/instance'
import type { PaginatedResponse } from '../types/common'
import type {
  Customer,
  CustomerOrdersQueryParams,
  CustomerQueryParams,
  CustomerSummaryResponse,
  UpdateCustomerRequest,
} from '../types/customers'
import type { SimpleOrder } from '../types/orders'

export const customersApi = {
  getById: (id: string) =>
    authenticatedClient.get<Customer>(`/customers/${id}`),

  getByPhone: (phone: string) =>
    anonymousClient.get<Customer>(
      `/customers/by-phone/${encodeURIComponent(phone)}`,
    ),

  list: (params?: CustomerQueryParams) =>
    authenticatedClient.get<PaginatedResponse<CustomerSummaryResponse>>(
      '/customers',
      { params },
    ),

  listOrders: (customerId: string, params: CustomerOrdersQueryParams) =>
    authenticatedClient.get<PaginatedResponse<SimpleOrder>>(
      `/customers/${customerId}/orders`,
      { params },
    ),

  update: (id: string, data: UpdateCustomerRequest) =>
    authenticatedClient.put<Customer>(`/customers/${id}`, data),
}
