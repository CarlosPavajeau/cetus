import axios from 'axios'

export enum OrderStatus {
  Pending,
  Paid,
  Delivered,
  Canceled,
}

export const OrderStatusText = {
  [OrderStatus.Pending]: 'Pendiente',
  [OrderStatus.Paid]: 'Pagado',
  [OrderStatus.Delivered]: 'Enviado',
  [OrderStatus.Canceled]: 'Cancelado',
}

export const OrderStatusColor = {
  [OrderStatus.Pending]: 'bg-amber-500',
  [OrderStatus.Paid]: 'bg-emerald-500',
  [OrderStatus.Delivered]: 'bg-emerald-500',
  [OrderStatus.Canceled]: 'bg-red-500',
}

export type Order = {
  id: string
  address: string
  total: number
  status: OrderStatus
  items: {
    id: string
    productName: string
    imageUrl?: string
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
    imageUrl?: string
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

export type SimpleOrder = {
  id: string
  address: string
  total: number
  status: OrderStatus
  createdAt: string
}

export const fetchOrders = async () => {
  const response = await axios.get<SimpleOrder[]>(
    `${import.meta.env.PUBLIC_API_URL}/orders`,
  )

  return response.data
}

export type UpdateOrderRequest = {
  id: string
  status: OrderStatus
}

export const updateOrder = async (order: UpdateOrderRequest) => {
  const response = await axios.put<SimpleOrder>(
    `${import.meta.env.PUBLIC_API_URL}/orders/${order.id}`,
    order,
  )

  return response.data
}
