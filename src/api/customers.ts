import { API_ENDPOINT } from '@/shared/constants'
import axios from 'axios'

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
}

export async function fetchCustomer(id: string) {
  const response = await axios.get<Customer>(`${API_ENDPOINT}/customers/${id}`)

  return response.data
}
