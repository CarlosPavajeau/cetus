import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

type Params = {
  page: number
  pageSize: number
}

export function useCustomerOrders(customerId: string, params: Params) {
  return useQuery({
    queryKey: ['customers', customerId, 'orders', params],
    queryFn: () =>
      api.customers.listOrders({
        customerId,
        page: params.page,
        pageSize: params.pageSize,
      }),
    enabled: !!customerId,
  })
}
