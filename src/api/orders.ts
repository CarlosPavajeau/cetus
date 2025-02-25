import axios from 'axios'

export enum OrderStatus {
  Pending,
  Paid,
  Delivered,
  Canceled,
}

export type Order = {
  id: string
  address: string
  total: number
  status: OrderStatus
  items: {
    id: string
    productName: string
    quantity: number
    price: number
  }[]
  customer: {
    name: string
    email: string
    phone: string
  }
  createdAt: string
}

export const fetchOrder = async (id: string) => {
  const response = await axios.get<Order>(
    `${import.meta.env.PUBLIC_API_URL}/orders/${id}`,
  )

  return response.data
}

export type CreateOrderRequest = {
  address: string
  total: number
  items: {
    productName: string
    productId: string
    quantity: number
    price: number
  }[]
  customer: {
    id: string
    name: string
    email: string
    phone: string
    address: string
  }
}

export const createOrder = async (order: CreateOrderRequest) => {
  const response = await axios.post<string>(
    `${import.meta.env.PUBLIC_API_URL}/orders`,
    order,
  )

  return response.data
}
