import axios from 'axios'

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
}

export async function fetchCustomer(id: string) {
  const response = await axios.get<Customer>(
    `${import.meta.env.PUBLIC_API_URL}/customers/${id}`,
  )

  return response.data
}
