import { anonymousClient, authenticatedClient } from '../core/instance'
import type { PaginatedResponse } from '../types/common'
import type {
  Customer,
  CustomerQueryParams,
  CustomerSummaryResponse,
} from '../types/customers'

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
}
