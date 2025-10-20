import { anonymousApi } from '@/api/client'

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
}

export async function fetchCustomer(id: string) {
  const response = await anonymousApi.get<Customer>(`/customers/${id}`)

  return response.data
}
