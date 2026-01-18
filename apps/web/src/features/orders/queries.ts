import { api } from '@cetus/api-client'
import { createQueryKeys } from '@cetus/web/lib/query/create-query-keys'
import { queryOptions } from '@tanstack/react-query'

export const ordersKeys = createQueryKeys('orders')

export const orderQueries = {
  list: (filters?: Record<string, unknown>) =>
    queryOptions({
      queryKey: ordersKeys.list(filters),
      queryFn: () => api.orders.list(filters),
    }),

  detail: (orderId: string) =>
    queryOptions({
      queryKey: ordersKeys.detail(orderId),
      queryFn: () => api.orders.getById(orderId),
    }),

  summary: (month: string) =>
    queryOptions({
      queryKey: [...ordersKeys.lists(), 'summary', month],
      queryFn: () => api.orders.summary(month),
    }),

  insights: (month: string) =>
    queryOptions({
      queryKey: [...ordersKeys.lists(), 'insights', month],
      queryFn: () => api.orders.getInsights(month),
    }),

  deliveryFees: {
    detail: (cityId: string) =>
      queryOptions({
        queryKey: [...ordersKeys.details(), 'delivery-fees', cityId],
        queryFn: () => api.orders.deliveryFees.getByCity(cityId),
        enabled: !!cityId,
      }),
  },

  payment: {
    info: (orderId: string) =>
      queryOptions({
        queryKey: [...ordersKeys.details(), 'payment', orderId],
        queryFn: () => api.orders.payments.getByOrderId(orderId),
        staleTime: 300_000, // 5 minutes
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: 2,
      }),
  },
}
