import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type { Customer, UpdateCustomerRequest } from '../types/customers'
import type { SimpleOrder } from '../types/orders'

const definitions = {
  list: {
    method: 'GET',
    path: '/customers',
  } as EndpointDefinition<Customer[]>,
  listOrders: {
    method: 'GET',
    path: (customerId: string) => `/customers/${customerId}/orders`,
  } as EndpointDefinition<SimpleOrder[], void, string>,
  getById: {
    method: 'GET',
    path: (id: string) => `/customers/${id}`,
  } as EndpointDefinition<Customer, void, string>,
  getByPhone: {
    method: 'GET',
    path: (phone: string) => `/customers/by-phone/${encodeURIComponent(phone)}`,
  } as EndpointDefinition<Customer, void, string>,
  update: {
    method: 'PUT',
    path: (id: string) => `/customers/${id}`,
  } as EndpointDefinition<Customer, UpdateCustomerRequest, string>,
}

export const customersApi = defineResource(definitions)
