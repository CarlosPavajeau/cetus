import { anonymousClient } from '../core/instance'
import type { Customer } from '../types/customers'

export const customersApi = {
  getById: (id: string) => anonymousClient.get<Customer>(`/customers/${id}`),

  getByPhone: (phone: string) =>
    anonymousClient.get<Customer>(`/customers/by-phone/${phone}`),
}
