import { api } from '@cetus/api-client'
import type { CustomerOrdersQueryParams } from '@cetus/api-client/types/customers'
import { createQueryKeys } from '@cetus/web/lib/query/create-query-keys'
import { queryOptions } from '@tanstack/react-query'

export const customerKeys = createQueryKeys('customers')

export const customerQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: customerKeys.detail(id),
      queryFn: () => api.customers.getById(id),
    }),

  detailByPhone: (phone: string) =>
    queryOptions({
      queryKey: [...customerKeys.details(), 'by-phone', phone],
      queryFn: () => api.customers.getByPhone(phone),
      enabled: Boolean(phone),
    }),

  listOrders: (customerId: string, params: CustomerOrdersQueryParams) =>
    queryOptions({
      queryKey: [
        ...customerKeys.details(),
        customerId,
        'orders',
        params.page,
        params.pageSize,
      ],
      queryFn: () => api.customers.listOrders(customerId, params),
    }),
}
