import { anonymousClient } from '../core/instance'
import type { Customer } from '../types/customers'

export const customersApi = {
  getById: (id: string) => anonymousClient.get<Customer>(`/customers/${id}`),
}
